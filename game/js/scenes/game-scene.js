import { createLevelConfig } from '../core/config.js';
import { approach, normalizeAngleDifference, updateAngle } from '../core/motion.js';
import { hasWorldCollision } from '../game/collision-system.js';
import { LevelData } from '../game/level-data.js';
import { createInitialSessionState } from '../game/session-state.js';
import { generateWorld } from '../game/world-generator.js';
import { isNpcWithinRange, pickNearestByDistance } from '../game/rules.js';
import { getViewportSize, getViewportRect, getWorldPointFromClient, syncCameraToPlayer, updateCamera } from '../game/camera-system.js';
import {
    renderCollectibles,
    collectNearbyCollectibles,
    findNearestCollectible,
    countByKind
} from '../game/collectible-system.js';
import { t } from '../i18n/index.js';
import { HUDController } from '../ui/hud-controller.js';
import { DialogScene } from './dialog-scene.js';
import { PauseScene } from './pause-scene.js';
import { TaskPicker } from '../game/task-picker.js';
import { Joystick } from '../ui/joystick.js';

function getNpcIcon(npc) {
    const iconKey = `entities.${npc.type}Icon`;
    const icon = t(iconKey);
    return icon === iconKey ? npc.name.slice(0, 1) : icon;
}

export class GameScene {
    constructor(deps) {
        this.dom = deps.dom;
        this.input = deps.input;
        this.announcer = deps.announcer;
        this.eventBus = deps.eventBus;
        this.sceneManager = deps.sceneManager;

        this.level = deps.level ?? LevelData.level1;
        this.config = createLevelConfig(this.level);

        this.session = createInitialSessionState(this.level);
        this.state = this.session.player;
        this.obstacles = this.session.obstacles;
        this.collectibles = this.session.collectibles;
        this.npcs = this.session.npcs;
        this.nearbyNpcId = this.session.nearbyNpcId;
        this.handleWorldClickBind = this.handleWorldClick.bind(this);
        this.handleKeydownBind = this.handleKeydown.bind(this);
        this._npcElements = new Map(); // npc.id → DOM element cache
        this._earnedStars = 0;        // tracks stars for adaptive difficulty
        this._collisionRects = [];    // obstacles + NPCs, rebuilt only when the world changes

        this.generateWorld();
    }

    get levelName() {
        return t(this.level.nameKey);
    }

    clearSceneDOM() {
        this.dom.obstaclesContainer.innerHTML = '';
        this.dom.itemsContainer.innerHTML = '';
        this.dom.npcsContainer.innerHTML = '';
        this._npcElements.clear();
    }

    generateWorld() {
        const world = generateWorld({
            config: this.config,
            player: this.state,
            npcs: this.npcs
        });

        this.obstacles.push(...world.obstacles);
        this.collectibles.push(...world.collectibles);
        this.npcs.splice(0, this.npcs.length, ...world.npcs);

        // Перешкоди й NPC нерухомі, тож список прямокутників для колізій
        // будується один раз, а не на кожну перевірку в кадрі.
        this._collisionRects = [...this.obstacles, ...this.npcs];
    }

    init() {
        this.applyWorldSize();
        this.clearSceneDOM();
        this.renderObstacles();
        this.renderCollectibles();
        this.renderNpcs();
        this.mountMoveTarget();
        this.dom.gameArea.addEventListener('click', this.handleWorldClickBind);
        document.addEventListener('keydown', this.handleKeydownBind);
        this.syncCameraToPlayer();
        HUDController.setLevel({ index: this.level.index, total: LevelData.count, name: this.levelName });
        HUDController.setObjective(this.describeObjective());
        HUDController.setContext(t('hud.contextIntro'));
        HUDController.setNearbyNpc(null);
        this.updateAccessibilityDescription();
        this.announcer.announce(
            t('announcer.levelStarted', { index: this.level.index, name: this.levelName }),
            'assertive'
        );

        // Track stars earned this session for adaptive difficulty
        this._earnedStarsUnsub = this.eventBus.on('puzzle:completed', (data) => {
            this._earnedStars += data.stars ?? 1;
        });
    }

    /** Кожен рівень має власний розмір світу — переносимо його в CSS. */
    applyWorldSize() {
        this.dom.gameArea.style.width = `${this.config.worldWidth}px`;
        this.dom.gameArea.style.height = `${this.config.worldHeight}px`;
    }

    /** Текст цілі залежить від того, чи є на рівні груші. */
    describeObjective() {
        const counts = countByKind(this.collectibles);
        return counts.pear > 0 ? t('hud.objectiveTextPears') : t('hud.objectiveText');
    }

    mountMoveTarget() {
        this.moveTargetEl = document.createElement('div');
        this.moveTargetEl.id = 'move-target';
        this.moveTargetEl.setAttribute('aria-hidden', 'true');
        this.moveTargetEl.hidden = true;
        this.dom.gameArea.appendChild(this.moveTargetEl);
    }

    pause() {
        this.input.clearTarget();
        this.input.deactivateKeyboardMode();
    }

    destroy() {
        this._earnedStarsUnsub?.();
        this.dom.gameArea.removeEventListener('click', this.handleWorldClickBind);
        document.removeEventListener('keydown', this.handleKeydownBind);
        if (this.moveTargetEl) {
            this.moveTargetEl.remove();
            this.moveTargetEl = null;
        }
    }

    handleKeydown(event) {
        // Only handle Escape when GameScene is the active scene (not covered by a dialog)
        if (this.sceneManager.active !== this) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            this.openPause();
        }
    }

    openPause() {
        this.sceneManager.push(new PauseScene({
            dom: this.dom,
            input: this.input,
            announcer: this.announcer,
            sceneManager: this.sceneManager
        }));
    }

    resume() {
        this.input.mouse.isDown = false;
        this.announcer.announce(t('announcer.gameResumed'));
    }

    renderObstacles() {
        this.obstacles.forEach((obstacle) => {
            const element = document.createElement('div');
            element.className = `obstacle ${obstacle.type}`;
            element.style.left = `${obstacle.x}px`;
            element.style.top = `${obstacle.y}px`;
            element.style.width = `${obstacle.w}px`;
            element.style.height = `${obstacle.h}px`;
            element.setAttribute('role', 'img');
            element.setAttribute('aria-label', t(`entities.${obstacle.type}`));
            this.dom.obstaclesContainer.appendChild(element);
        });
    }

    renderCollectibles() {
        renderCollectibles(this.collectibles, this.dom.itemsContainer);
    }

    renderNpcs() {
        this.npcs.forEach((npc) => {
            const element = document.createElement('div');
            element.className = `npc ${npc.type}`;
            element.style.left = `${npc.x}px`;
            element.style.top = `${npc.y}px`;
            element.style.width = `${npc.w}px`;
            element.style.height = `${npc.h}px`;
            element.dataset.id = npc.id;

            if (npc.completed) {
                // NPC already completed (e.g. restored from saved progress)
                element.classList.add('completed');
                element.setAttribute('aria-label', t('entities.npcCompleted', { name: npc.name }));
            } else {
                element.dataset.gameInteractive = '';
                element.setAttribute('role', 'button');
                element.setAttribute('tabindex', '0');
                element.setAttribute('aria-label', t('entities.npcPrompt', { name: npc.name }));
            }
            element.textContent = getNpcIcon(npc);

            // Completed NPCs are purely decorative — no interaction needed
            if (npc.completed) {
                this._npcElements.set(npc.id, element);
                this.dom.npcsContainer.appendChild(element);
                return;
            }

            const stopNpcPointer = (event) => {
                if (event.cancelable) {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.input.mouse.isDown = false;
                this.input.clearTarget();
            };

            element.addEventListener('pointerdown', stopNpcPointer);
            element.addEventListener('pointerup', (event) => {
                stopNpcPointer(event);
                this.tryInteractWithNpc(npc);
            });
            element.addEventListener('mousedown', stopNpcPointer);
            element.addEventListener('touchstart', stopNpcPointer, { passive: true });

            element.addEventListener('click', (event) => {
                stopNpcPointer(event);
                this.tryInteractWithNpc(npc);
            });

            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.tryInteractWithNpc(npc);
                }
            });

            this._npcElements.set(npc.id, element);
            this.dom.npcsContainer.appendChild(element);
        });
    }

    handleWorldClick(event) {
        if (this.input.isInteractiveTarget(event.target)) {
            return;
        }

        const point = this.getWorldPointFromClient(event.clientX, event.clientY);
        const npc = this.findNpcAtWorldPoint(point.x, point.y);

        if (!npc) {
            // Click-to-move: single click on empty ground sets the destination.
            // Player moves there and stops automatically when arrived.
            // Hold-to-drag (mouse.isDown) still works alongside this.
            if (!this.input.keyboard.active) {
                this.input.mouse.intentTarget = point;
            }
            return;
        }

        event.preventDefault();
        this.input.mouse.isDown = false;
        this.input.clearTarget();
        this.tryInteractWithNpc(npc);
    }

    getPointerWorldTarget() {
        const rect = getViewportRect(this.dom);
        return getWorldPointFromClient(this.input.mouse.x, this.input.mouse.y, this.state.camera, rect);
    }

    getWorldPointFromClient(clientX, clientY) {
        const rect = getViewportRect(this.dom);
        return getWorldPointFromClient(clientX, clientY, this.state.camera, rect);
    }

    findNpcAtWorldPoint(x, y) {
        const hitPadding = 14;

        return this.npcs.find((npc) => (
            !npc.completed
            && x >= npc.x - hitPadding
            && x <= npc.x + npc.w + hitPadding
            && y >= npc.y - hitPadding
            && y <= npc.y + npc.h + hitPadding
        )) ?? null;
    }

    syncCameraToPlayer() {
        syncCameraToPlayer(this.state, this.config, getViewportSize(this.dom));
    }

    update(deltaMs = 16.667) {
        const scale = deltaMs / 16.667;

        this.input.updateCameraOffset(this.state.camera.x, this.state.camera.y);

        this.collectNearbyCollectibles();
        this.updateNearbyNpcState();

        if (!this.input.keyboard.active && this.nearbyNpcId && this.input.consumeKey('Enter')) {
            const npc = this.npcs.find((candidate) => candidate.id === this.nearbyNpcId);
            if (npc) {
                this.tryInteractWithNpc(npc);
            }
        }

        const intent = this.getMovementIntent();
        this.updateVelocity(intent.x, intent.y, scale);
        this.updateRotation(scale);
        this.updateCamera(scale);

        if (performance.now() - this.state.lastA11yUpdate > 1200) {
            this.updateAccessibilityDescription();
            this.state.lastA11yUpdate = performance.now();
        }
    }

    getMovementIntent() {
        let intentX = 0;
        let intentY = 0;

        if (this.input.mouse.isDown && !this.input.keyboard.active) {
            this.input.mouse.intentTarget = this.getPointerWorldTarget();
        }

        // Virtual joystick (touch) takes priority over keyboard keys
        const joy = Joystick.getIntent();
        if (joy.x !== 0 || joy.y !== 0) {
            intentX = joy.x;
            intentY = joy.y;
        } else {
            if (this.input.keys.w || this.input.keys.ArrowUp) intentY -= 1;
            if (this.input.keys.s || this.input.keys.ArrowDown) intentY += 1;
            if (this.input.keys.a || this.input.keys.ArrowLeft) intentX -= 1;
            if (this.input.keys.d || this.input.keys.ArrowRight) intentX += 1;
        }

        if (intentX === 0 && intentY === 0 && this.input.mouse.intentTarget) {
            const dx = this.input.mouse.intentTarget.x - this.state.x;
            const dy = this.input.mouse.intentTarget.y - this.state.y;
            const distance = Math.hypot(dx, dy);

            if (distance > this.config.pointerArrivalRadius) {
                intentX = dx / distance;
                intentY = dy / distance;
            } else {
                this.input.clearTarget();
            }
        }

        if (intentX === 0 && intentY === 0) {
            return { x: 0, y: 0 };
        }

        const length = Math.hypot(intentX, intentY);
        return { x: intentX / length, y: intentY / length };
    }

    updateVelocity(intentX, intentY, scale = 1) {
        const targetVelocityX = intentX * this.config.maxSpeed;
        const targetVelocityY = intentY * this.config.maxSpeed;
        const hasIntent = intentX !== 0 || intentY !== 0;
        const delta = hasIntent ? this.config.acceleration : this.config.deceleration;

        this.state.velocityX = approach(this.state.velocityX, targetVelocityX, delta, scale);
        this.state.velocityY = approach(this.state.velocityY, targetVelocityY, delta, scale);

        if (Math.abs(this.state.velocityX) < 0.01) this.state.velocityX = 0;
        if (Math.abs(this.state.velocityY) < 0.01) this.state.velocityY = 0;

        this.resolveMovement(this.state.velocityX * scale, this.state.velocityY * scale);
    }

    resolveMovement(dx, dy) {
        // Try full diagonal move first
        const nx = this.state.x + dx;
        const ny = this.state.y + dy;

        if (!this.isCollision(nx, ny)) {
            this.state.x = nx;
            this.state.y = ny;
            return;
        }

        // Diagonal blocked — try sliding along X axis only
        if (dx !== 0 && !this.isCollision(nx, this.state.y)) {
            this.state.x = nx;
            this.state.velocityY = 0;
            return;
        }

        // Try sliding along Y axis only
        if (dy !== 0 && !this.isCollision(this.state.x, ny)) {
            this.state.y = ny;
            this.state.velocityX = 0;
            return;
        }

        // Fully blocked — stop and clear click-to-move target
        this.state.velocityX = 0;
        this.state.velocityY = 0;
        this.input.clearTarget();
    }

    isCollision(px, py) {
        if (py < this.config.playerRadius + this.config.topHudSafeArea) {
            return true;
        }

        return hasWorldCollision({
            x: px,
            y: py,
            radius: this.config.playerRadius,
            worldWidth: this.config.worldWidth,
            worldHeight: this.config.worldHeight,
            rects: this._collisionRects
        });
    }

    updateRotation(scale = 1) {
        const speed = Math.hypot(this.state.velocityX, this.state.velocityY);

        if (speed > this.config.rotationMinSpeed) {
            this.state.targetAngle = Math.atan2(this.state.velocityY, this.state.velocityX) * (180 / Math.PI);
        }

        this.state.angle = updateAngle(
            this.state.angle,
            this.state.targetAngle,
            this.config.rotationLerp,
            this.config.rotationSnapThreshold,
            scale
        );
    }

    updateNearbyNpcState() {
        let nearestNpc = null;
        let nearestDistance = Infinity;

        this.npcs.forEach((npc) => {
            const npcEl = this._npcElements.get(npc.id) ?? null;
            const distance = Math.hypot(
                this.state.x - (npc.x + npc.w / 2),
                this.state.y - (npc.y + npc.h / 2)
            );
            const isNearby = !npc.completed && isNpcWithinRange(distance, this.config.interactionRadius);

            npc.isNearby = isNearby;

            if (npcEl) {
                npcEl.classList.toggle('npc--near', isNearby);
            }

            if (isNearby && distance < nearestDistance) {
                nearestDistance = distance;
                nearestNpc = npc;
            }

            if (!isNearby) {
                npc.hasPrompted = false;
            }
        });

        this.nearbyNpcId = nearestNpc ? nearestNpc.id : null;
        this.session.nearbyNpcId = this.nearbyNpcId;

        if (nearestNpc && !nearestNpc.hasPrompted) {
            nearestNpc.hasPrompted = true;
            HUDController.setObjective(t('hud.objectiveMeetNpc', { name: nearestNpc.name }));
            HUDController.setContext(t('announcer.npcNearby', { name: nearestNpc.name }));
            HUDController.setNearbyNpc(nearestNpc.name);
            this.announcer.announce(t('announcer.npcNearby', { name: nearestNpc.name }));
        } else if (!nearestNpc) {
            HUDController.setObjective(this.describeObjective());
            HUDController.setContext(t('hud.contextExplore'));
            HUDController.setNearbyNpc(null);
        }
    }

    tryInteractWithNpc(npc) {
        if (this.sceneManager.active !== this) {
            return;
        }

        if (npc.completed) {
            return;
        }

        const distance = Math.hypot(
            this.state.x - (npc.x + npc.w / 2),
            this.state.y - (npc.y + npc.h / 2)
        );

        if (!isNpcWithinRange(distance, this.config.interactionRadius)) {
            HUDController.setContext(t('announcer.moveCloser'));
            this.announcer.announce(t('announcer.moveCloser'));
            return;
        }

        // Re-pick task adaptively based on stars earned so far this session
        npc.activeTask = TaskPicker.pickAdaptiveTask(
            npc.taskPoolIds,
            this._earnedStars,
            Math.random,
            this.session
        );

        this.sceneManager.push(new DialogScene({
            dom: this.dom,
            input: this.input,
            announcer: this.announcer,
            eventBus: this.eventBus,
            sceneManager: this.sceneManager,
            npc
        }));
    }

    collectNearbyCollectibles() {
        collectNearbyCollectibles({
            items: this.collectibles,
            playerX: this.state.x,
            playerY: this.state.y,
            playerRadius: this.config.playerRadius,
            eventBus: this.eventBus,
            announcer: this.announcer
        });
    }

    updateCamera(scale = 1) {
        updateCamera(this.state, this.config, getViewportSize(this.dom), scale);
    }

    updateAccessibilityDescription() {
        const nearestItem = this.findNearestCollectible();
        const nearestNpc = this.findNearestNpc();
        let description = t('gameState.position', { x: Math.round(this.state.x), y: Math.round(this.state.y) });

        if (nearestItem) {
            const distance = Math.hypot(this.state.x - nearestItem.x, this.state.y - nearestItem.y);
            description += t('gameState.nearestItem', {
                item: t(`entities.${nearestItem.kind ?? 'apple'}`),
                direction: this.getDirection(nearestItem.x, nearestItem.y),
                distance: Math.round(distance)
            });
        }

        if (nearestNpc && !nearestNpc.completed) {
            const distance = Math.hypot(this.state.x - (nearestNpc.x + 24), this.state.y - (nearestNpc.y + 24));
            if (isNpcWithinRange(distance, this.config.interactionRadius)) {
                description += t('gameState.nearbyNpc', { name: nearestNpc.name });
            }
        }

        this.announcer.updateGameState(description);
    }

    findNearestCollectible() {
        return findNearestCollectible(this.collectibles, this.state.x, this.state.y);
    }

    findNearestNpc() {
        return pickNearestByDistance(this.npcs, (npc) => Math.hypot(this.state.x - (npc.x + 24), this.state.y - (npc.y + 24)));
    }

    getDirection(targetX, targetY) {
        const dx = targetX - this.state.x;
        const dy = targetY - this.state.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (angle >= -22.5 && angle < 22.5) return t('directions.right');
        if (angle >= 22.5 && angle < 67.5) return t('directions.rightDown');
        if (angle >= 67.5 && angle < 112.5) return t('directions.down');
        if (angle >= 112.5 && angle < 157.5) return t('directions.leftDown');
        if (angle >= 157.5 || angle < -157.5) return t('directions.left');
        if (angle >= -157.5 && angle < -112.5) return t('directions.leftUp');
        if (angle >= -112.5 && angle < -67.5) return t('directions.up');
        return t('directions.rightUp');
    }

    render() {
        this.dom.gameArea.style.transform = `translate(${-this.state.camera.x}px, ${-this.state.camera.y}px)`;
        this.dom.playerWrapper.style.left = `${this.state.x}px`;
        this.dom.playerWrapper.style.top = `${this.state.y}px`;
        this.dom.playerInner.style.transform = `rotate(${this.state.angle}deg)`;

        const speed = Math.hypot(this.state.velocityX, this.state.velocityY);
        const angleDiff = normalizeAngleDifference(this.state.targetAngle - this.state.angle);

        this.dom.playerInner.classList.toggle('is-moving', speed > 0.12);
        this.dom.playerInner.classList.toggle('is-idle', speed <= 0.12);
        this.dom.playerInner.classList.toggle('is-turning-left', angleDiff < -8);
        this.dom.playerInner.classList.toggle('is-turning-right', angleDiff > 8);

        this.renderMoveTarget();
    }

    renderMoveTarget() {
        if (!this.moveTargetEl) {
            return;
        }

        const target = this.input.mouse.intentTarget;
        const visible = Boolean(target) && !this.input.keyboard.active;

        if (visible) {
            this.moveTargetEl.style.left = `${target.x}px`;
            this.moveTargetEl.style.top = `${target.y}px`;
            this.moveTargetEl.hidden = false;
        } else {
            this.moveTargetEl.hidden = true;
        }
    }
}
