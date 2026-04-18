import { CONFIG } from '../core/config.js';
import { approach, normalizeAngleDifference, updateAngle } from '../core/motion.js';
import { LevelData } from '../game/level-data.js';
import { TaskPicker } from '../game/task-picker.js';
import { isNpcWithinRange, shouldCollectApple, pickNearestByDistance } from '../game/rules.js';
import { t } from '../i18n/index.js';
import { HUDController } from '../ui/hud-controller.js';
import { DialogScene } from './dialog-scene.js';

export class GameScene {
    constructor(deps) {
        this.dom = deps.dom;
        this.input = deps.input;
        this.announcer = deps.announcer;
        this.eventBus = deps.eventBus;
        this.sceneManager = deps.sceneManager;

        this.state = {
            x: 2000,
            y: 2000,
            velocityX: 0,
            velocityY: 0,
            angle: 0,
            targetAngle: 0,
            camera: { x: 0, y: 0 },
            targetCamera: { x: 0, y: 0 },
            lastA11yUpdate: 0
        };

        this.obstacles = [];
        this.apples = [];
        this.npcs = LevelData.level1.npcs.map((npc) => TaskPicker.buildNpcSessionState(npc));
        this.nearbyNpcId = null;

        this.generateWorld();
    }

    clearSceneDOM() {
        this.dom.obstaclesContainer.innerHTML = '';
        this.dom.itemsContainer.innerHTML = '';
        this.dom.npcsContainer.innerHTML = '';
    }

    generateWorld() {
        const obstacleTypes = ['rock', 'bush', 'twig'];

        for (let index = 0; index < CONFIG.obstacleCount; index += 1) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 50) {
                const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
                const isHorizontal = Math.random() > 0.5;
                const w = type === 'twig'
                    ? (isHorizontal ? Math.random() * 100 + 80 : 24)
                    : Math.random() * 60 + 48;
                const h = type === 'twig'
                    ? (isHorizontal ? 24 : Math.random() * 100 + 80)
                    : w;
                const x = Math.random() * (CONFIG.worldWidth - w - 200) + 100;
                const y = Math.random() * (CONFIG.worldHeight - h - 200) + 100;

                if (Math.hypot((x + w / 2) - this.state.x, (y + h / 2) - this.state.y) < 220) {
                    attempts += 1;
                    continue;
                }

                const overlap = this.obstacles.some((obstacle) =>
                    x < obstacle.x + obstacle.w + 40 &&
                    x + w + 40 > obstacle.x &&
                    y < obstacle.y + obstacle.h + 40 &&
                    y + h + 40 > obstacle.y
                );

                if (!overlap) {
                    this.obstacles.push({ x, y, w, h, type });
                    placed = true;
                }

                attempts += 1;
            }
        }

        for (let index = 0; index < CONFIG.appleCount; index += 1) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 50) {
                const x = Math.random() * (CONFIG.worldWidth - 240) + 120;
                const y = Math.random() * (CONFIG.worldHeight - 240) + 120;

                const overlap = this.obstacles.some((obstacle) =>
                    x < obstacle.x + obstacle.w &&
                    x + 28 > obstacle.x &&
                    y < obstacle.y + obstacle.h &&
                    y + 28 > obstacle.y
                );

                if (!overlap) {
                    this.apples.push({ id: index, x, y, w: 28, h: 28 });
                    placed = true;
                }

                attempts += 1;
            }
        }
    }

    init() {
        this.clearSceneDOM();
        this.renderObstacles();
        this.renderApples();
        this.renderNpcs();
        this.syncCameraToPlayer();
        HUDController.setObjective(t('hud.objectiveText'));
        HUDController.setContext(t('hud.contextIntro'));
        HUDController.setNearbyNpc(null);
        this.updateAccessibilityDescription();
        this.announcer.announce(t('announcer.newGameStarted'), 'assertive');
    }

    pause() {
        this.input.clearTarget();
        this.input.deactivateKeyboardMode();
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

    renderApples() {
        this.apples.forEach((apple) => {
            const element = document.createElement('div');
            element.className = 'apple';
            element.id = `apple-${apple.id}`;
            element.style.left = `${apple.x}px`;
            element.style.top = `${apple.y}px`;
            element.setAttribute('role', 'img');
            element.setAttribute('aria-label', t('entities.apple'));
            this.dom.itemsContainer.appendChild(element);
        });
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
            element.setAttribute('role', 'button');
            element.setAttribute('tabindex', '0');
            element.setAttribute('aria-label', t('entities.npcPrompt', { name: npc.name }));
            element.textContent = npc.type === 'beetle' ? t('entities.beetleIcon') : t('entities.mouseIcon');

            element.addEventListener('click', () => {
                this.tryInteractWithNpc(npc);
            });

            element.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.tryInteractWithNpc(npc);
                }
            });

            this.dom.npcsContainer.appendChild(element);
        });
    }

    syncCameraToPlayer() {
        this.state.targetCamera.x = Math.max(0, Math.min(
            this.state.x - window.innerWidth / 2,
            CONFIG.worldWidth - window.innerWidth
        ));
        this.state.targetCamera.y = Math.max(0, Math.min(
            this.state.y - window.innerHeight / 2,
            CONFIG.worldHeight - window.innerHeight
        ));
        this.state.camera.x = this.state.targetCamera.x;
        this.state.camera.y = this.state.targetCamera.y;
    }

    update() {
        this.input.updateCameraOffset(this.state.camera.x, this.state.camera.y);

        this.collectNearbyApples();
        this.updateNearbyNpcState();

        if (!this.input.keyboard.active && this.nearbyNpcId && this.input.consumeKey('Enter')) {
            const npc = this.npcs.find((candidate) => candidate.id === this.nearbyNpcId);
            if (npc) {
                this.tryInteractWithNpc(npc);
            }
        }

        const intent = this.getMovementIntent();
        this.updateVelocity(intent.x, intent.y);
        this.updateRotation();
        this.updateCamera();

        if (performance.now() - this.state.lastA11yUpdate > 1200) {
            this.updateAccessibilityDescription();
            this.state.lastA11yUpdate = performance.now();
        }
    }

    getMovementIntent() {
        let intentX = 0;
        let intentY = 0;

        if (this.input.mouse.isDown && !this.input.keyboard.active) {
            this.input.mouse.intentTarget = {
                x: this.input.mouse.x + this.state.camera.x,
                y: this.input.mouse.y + this.state.camera.y
            };
        }

        if (this.input.keys.w || this.input.keys.ArrowUp) intentY -= 1;
        if (this.input.keys.s || this.input.keys.ArrowDown) intentY += 1;
        if (this.input.keys.a || this.input.keys.ArrowLeft) intentX -= 1;
        if (this.input.keys.d || this.input.keys.ArrowRight) intentX += 1;

        if (intentX === 0 && intentY === 0 && this.input.mouse.intentTarget) {
            const dx = this.input.mouse.intentTarget.x - this.state.x;
            const dy = this.input.mouse.intentTarget.y - this.state.y;
            const distance = Math.hypot(dx, dy);

            if (distance > CONFIG.maxSpeed) {
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

    updateVelocity(intentX, intentY) {
        const targetVelocityX = intentX * CONFIG.maxSpeed;
        const targetVelocityY = intentY * CONFIG.maxSpeed;
        const hasIntent = intentX !== 0 || intentY !== 0;
        const delta = hasIntent ? CONFIG.acceleration : CONFIG.deceleration;

        this.state.velocityX = approach(this.state.velocityX, targetVelocityX, delta);
        this.state.velocityY = approach(this.state.velocityY, targetVelocityY, delta);

        if (Math.abs(this.state.velocityX) < 0.01) this.state.velocityX = 0;
        if (Math.abs(this.state.velocityY) < 0.01) this.state.velocityY = 0;

        this.resolveMovement(this.state.velocityX, this.state.velocityY);
    }

    resolveMovement(dx, dy) {
        if (dx !== 0) {
            const nextX = this.state.x + dx;

            if (this.isCollision(nextX, this.state.y)) {
                this.state.velocityX = 0;
                this.input.clearTarget();
            } else {
                this.state.x = nextX;
            }
        }

        if (dy !== 0) {
            const nextY = this.state.y + dy;

            if (this.isCollision(this.state.x, nextY)) {
                this.state.velocityY = 0;
                this.input.clearTarget();
            } else {
                this.state.y = nextY;
            }
        }
    }

    isCollision(px, py) {
        if (
            px < CONFIG.playerRadius ||
            px > CONFIG.worldWidth - CONFIG.playerRadius ||
            py < CONFIG.playerRadius ||
            py > CONFIG.worldHeight - CONFIG.playerRadius
        ) {
            return true;
        }

        return this.obstacles.some((obstacle) => {
            const testX = px < obstacle.x ? obstacle.x : px > obstacle.x + obstacle.w ? obstacle.x + obstacle.w : px;
            const testY = py < obstacle.y ? obstacle.y : py > obstacle.y + obstacle.h ? obstacle.y + obstacle.h : py;
            return Math.hypot(px - testX, py - testY) <= CONFIG.playerRadius;
        });
    }

    updateRotation() {
        const speed = Math.hypot(this.state.velocityX, this.state.velocityY);

        if (speed > 0.05) {
            this.state.targetAngle = Math.atan2(this.state.velocityY, this.state.velocityX) * (180 / Math.PI);
        }

        this.state.angle = updateAngle(
            this.state.angle,
            this.state.targetAngle,
            CONFIG.rotationLerp,
            CONFIG.rotationSnapThreshold
        );
    }

    updateNearbyNpcState() {
        let nearestNpc = null;
        let nearestDistance = Infinity;

        this.npcs.forEach((npc) => {
            const npcEl = document.querySelector(`.npc[data-id="${npc.id}"]`);
            const distance = Math.hypot(
                this.state.x - (npc.x + npc.w / 2),
                this.state.y - (npc.y + npc.h / 2)
            );
            const isNearby = !npc.completed && isNpcWithinRange(distance, CONFIG.interactionRadius);

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

        if (nearestNpc && !nearestNpc.hasPrompted) {
            nearestNpc.hasPrompted = true;
            HUDController.setObjective(t('hud.objectiveMeetNpc', { name: nearestNpc.name }));
            HUDController.setContext(t('announcer.npcNearby', { name: nearestNpc.name }));
            HUDController.setNearbyNpc(nearestNpc.name);
            this.announcer.announce(t('announcer.npcNearby', { name: nearestNpc.name }));
        } else if (!nearestNpc) {
            HUDController.setObjective(t('hud.objectiveText'));
            HUDController.setContext(t('hud.contextExplore'));
            HUDController.setNearbyNpc(null);
        }
    }

    tryInteractWithNpc(npc) {
        if (npc.completed) {
            return;
        }

        const distance = Math.hypot(
            this.state.x - (npc.x + npc.w / 2),
            this.state.y - (npc.y + npc.h / 2)
        );

        if (!isNpcWithinRange(distance, CONFIG.interactionRadius)) {
            HUDController.setContext(t('announcer.moveCloser'));
            this.announcer.announce(t('announcer.moveCloser'));
            return;
        }

        this.sceneManager.push(new DialogScene({
            dom: this.dom,
            input: this.input,
            announcer: this.announcer,
            eventBus: this.eventBus,
            sceneManager: this.sceneManager,
            npc
        }));
    }

    collectNearbyApples() {
        for (let index = this.apples.length - 1; index >= 0; index -= 1) {
            const apple = this.apples[index];
            const distance = Math.hypot(this.state.x - (apple.x + 14), this.state.y - (apple.y + 14));

            if (!shouldCollectApple(distance, CONFIG.playerRadius)) {
                continue;
            }

            this.eventBus.emit('item:collected', { type: 'apple', value: 1 });

            const appleEl = document.getElementById(`apple-${apple.id}`);
            if (appleEl) {
                appleEl.style.transform = 'scale(1.3)';
                appleEl.style.opacity = '0';
                setTimeout(() => appleEl.remove(), 180);
            }

            this.apples.splice(index, 1);

            if (this.apples.length % 4 === 0) {
                HUDController.setObjective(t('hud.objectiveApplesRemaining', { count: this.apples.length }));
                HUDController.setContext(t('announcer.applesRemaining', { count: this.apples.length }));
                this.announcer.announce(t('announcer.applesRemaining', { count: this.apples.length }));
            }
        }
    }

    updateCamera() {
        const screenX = this.state.x - this.state.targetCamera.x;
        const screenY = this.state.y - this.state.targetCamera.y;

        if (screenX < CONFIG.cameraThreshold) {
            this.state.targetCamera.x -= (CONFIG.cameraThreshold - screenX);
        } else if (screenX > window.innerWidth - CONFIG.cameraThreshold) {
            this.state.targetCamera.x += screenX - (window.innerWidth - CONFIG.cameraThreshold);
        }

        if (screenY < CONFIG.cameraThreshold) {
            this.state.targetCamera.y -= (CONFIG.cameraThreshold - screenY);
        } else if (screenY > window.innerHeight - CONFIG.cameraThreshold) {
            this.state.targetCamera.y += screenY - (window.innerHeight - CONFIG.cameraThreshold);
        }

        this.state.targetCamera.x = Math.max(0, Math.min(this.state.targetCamera.x, CONFIG.worldWidth - window.innerWidth));
        this.state.targetCamera.y = Math.max(0, Math.min(this.state.targetCamera.y, CONFIG.worldHeight - window.innerHeight));

        this.state.camera.x += (this.state.targetCamera.x - this.state.camera.x) * CONFIG.cameraLerp;
        this.state.camera.y += (this.state.targetCamera.y - this.state.camera.y) * CONFIG.cameraLerp;
    }

    updateAccessibilityDescription() {
        const nearestApple = this.findNearestApple();
        const nearestNpc = this.findNearestNpc();
        let description = t('gameState.position', { x: Math.round(this.state.x), y: Math.round(this.state.y) });

        if (nearestApple) {
            const distance = Math.hypot(this.state.x - nearestApple.x, this.state.y - nearestApple.y);
            description += t('gameState.nearestApple', {
                direction: this.getDirection(nearestApple.x, nearestApple.y),
                distance: Math.round(distance)
            });
        }

        if (nearestNpc && !nearestNpc.completed) {
            const distance = Math.hypot(this.state.x - (nearestNpc.x + 24), this.state.y - (nearestNpc.y + 24));
            if (isNpcWithinRange(distance, CONFIG.interactionRadius)) {
                description += t('gameState.nearbyNpc', { name: nearestNpc.name });
            }
        }

        this.announcer.updateGameState(description);
    }

    findNearestApple() {
        return pickNearestByDistance(this.apples, (apple) => Math.hypot(this.state.x - apple.x, this.state.y - apple.y));
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
    }
}
