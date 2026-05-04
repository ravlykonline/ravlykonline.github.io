
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COLS   = 9;
const ROWS   = 7;
const CELL   = 52;
const GW     = COLS * CELL;   // 468
const GH     = ROWS * CELL;   // 364
const SSIZE  = 48;            // snail element size

const DIR_ROT = { E:0, S:90, W:180, N:-90 };

// ─── SNAIL SVG ────────────────────────────────────────────────────────────────
const SNAIL_SVG = `<svg viewBox="0 0 72 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Shell -->
  <circle cx="46" cy="28" r="20" fill="#D4822A"/>
  <circle cx="46" cy="28" r="14" fill="#E8A050" opacity=".65"/>
  <circle cx="46" cy="28" r="8"  fill="#D4822A"/>
  <circle cx="46" cy="28" r="3.5" fill="#B06020" opacity=".75"/>
  <!-- Shell highlight -->
  <circle cx="40" cy="22" r="4" fill="white" opacity=".15"/>
  <!-- Body -->
  <ellipse cx="28" cy="48" rx="22" ry="11" fill="#7DC953"/>
  <!-- Underside -->
  <ellipse cx="28" cy="52" rx="18" ry="6" fill="#5DA030" opacity=".5"/>
  <!-- Head -->
  <circle cx="10" cy="42" r="11" fill="#8FD860"/>
  <!-- Eye stalks -->
  <line x1="7"  y1="34" x2="4"  y2="23" stroke="#7DC953" stroke-width="3" stroke-linecap="round"/>
  <circle cx="4"  cy="21" r="5.5" fill="#6BBF45"/>
  <circle cx="4"  cy="21" r="3.5" fill="#1a1a2e"/>
  <circle cx="5.5" cy="19.5" r="1.2" fill="white"/>
  <line x1="14" y1="33" x2="17" y2="22" stroke="#7DC953" stroke-width="3" stroke-linecap="round"/>
  <circle cx="17" cy="20" r="5.5" fill="#6BBF45"/>
  <circle cx="17" cy="20" r="3.5" fill="#1a1a2e"/>
  <circle cx="18.5" cy="18.5" r="1.2" fill="white"/>
  <!-- Smile -->
  <path d="M6 46 Q10 51 15 46" fill="none" stroke="#559925" stroke-width="2" stroke-linecap="round"/>
  <!-- Blush -->
  <ellipse cx="6"  cy="44" rx="3.5" ry="2.5" fill="#FF9898" opacity=".45"/>
  <!-- Paintbrush (pointing forward = right) -->
  <rect x="18" y="50" width="24" height="5" rx="2.5" fill="#8B6914"
        transform="rotate(-12 30 52.5)"/>
  <ellipse cx="43" cy="46" rx="5" ry="3.5" fill="#FFC107"
           transform="rotate(-12 30 52.5) translate(1 -2)"/>
  <path d="M42 42 L47 47 L38 47 Z" fill="#F5962A"
        transform="rotate(-12 30 52.5) translate(2 1)"/>
</svg>`;

// Smaller avatar version
const AVATAR_SVG = `<svg viewBox="0 0 72 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="46" cy="28" r="20" fill="#D4822A"/>
  <circle cx="46" cy="28" r="14" fill="#E8A050" opacity=".65"/>
  <circle cx="46" cy="28" r="8"  fill="#D4822A"/>
  <circle cx="46" cy="28" r="3.5" fill="#B06020" opacity=".75"/>
  <ellipse cx="28" cy="48" rx="22" ry="11" fill="#7DC953"/>
  <circle cx="10" cy="42" r="11" fill="#8FD860"/>
  <line x1="7" y1="34" x2="4" y2="23" stroke="#7DC953" stroke-width="3" stroke-linecap="round"/>
  <circle cx="4" cy="21" r="5.5" fill="#6BBF45"/>
  <circle cx="4" cy="21" r="3.5" fill="#1a1a2e"/>
  <circle cx="5.5" cy="19.5" r="1.2" fill="white"/>
  <line x1="14" y1="33" x2="17" y2="22" stroke="#7DC953" stroke-width="3" stroke-linecap="round"/>
  <circle cx="17" cy="20" r="5.5" fill="#6BBF45"/>
  <circle cx="17" cy="20" r="3.5" fill="#1a1a2e"/>
  <circle cx="18.5" cy="18.5" r="1.2" fill="white"/>
  <path d="M6 46 Q10 51 15 46" fill="none" stroke="#559925" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="6" cy="44" rx="3.5" ry="2.5" fill="#FF9898" opacity=".45"/>
</svg>`;

// ─── LESSONS ──────────────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: 1,
    title: 'Урок 1: Іди вперед',
    instruction: 'Рівлик хоче намалювати лінію вниз на <strong>4 клітинки</strong>. Натискай блок «рухайся ↓» потрібну кількість разів!',
    startPos: { x:4, y:1 }, startDir:'S',
    available: ['move_s'],
    goal: [[4,2],[4,3],[4,4],[4,5]],
    trailColor: '#F5962A',
    successMsg: 'Рівлик намалював пряму лінію! Так тримати!',
    successEmoji: '🖌️',
  },
  {
    id: 2,
    title: 'Урок 2: Права сторона',
    instruction: 'Тепер іди <strong>вправо 3 кроки, потім вниз 3 кроки</strong>. Намалюй куточок!',
    startPos: { x:1, y:2 }, startDir:'E',
    available: ['move_e','move_s'],
    goal: [[2,2],[3,2],[4,2],[4,3],[4,4],[4,5]],
    trailColor: '#1A9080',
    successMsg: 'Чудовий куточок! Рівлик-митець!',
    successEmoji: '🎨',
  },
  {
    id: 3,
    title: 'Урок 3: Повтори!',
    instruction: 'Намалюй лінію вниз <strong>5 разів</strong> використавши лише <strong>2 блоки</strong>. Підказка: скористайся «повтори»!',
    startPos: { x:4, y:1 }, startDir:'S',
    available: ['move_s','repeat'],
    goal: [[4,2],[4,3],[4,4],[4,5],[4,6]],
    trailColor: '#C72070',
    successMsg: 'Ти навчився використовувати петлю! Геніально!',
    successEmoji: '🔁',
    hint: 'Добав «повтори», потім «рухайся ↓» всередину петлі',
  },
  {
    id: 4,
    title: 'Урок 4: Буква Г',
    instruction: 'Намалюй букву <strong>Г</strong>: <strong>3 кроки вправо</strong>, потім <strong>3 кроки вниз</strong>.',
    startPos: { x:2, y:2 }, startDir:'E',
    available: ['move_e','move_s','repeat'],
    goal: [[3,2],[4,2],[5,2],[5,3],[5,4],[5,5]],
    trailColor: '#7B3F9E',
    successMsg: 'Відмінна літера Г! Рівлик пише як справжній художник!',
    successEmoji: '✏️',
  },
  {
    id: 5,
    title: 'Урок 5: Сходинки',
    instruction: 'Намалюй <strong>сходинки</strong>: три рази повтори «→ потім ↓».',
    startPos: { x:1, y:1 }, startDir:'E',
    available: ['move_e','move_s','repeat'],
    goal: [[2,1],[2,2],[3,2],[3,3],[4,3],[4,4]],
    trailColor: '#5DAD3A',
    successMsg: 'Яка гарна сходинка! Равлик йде вгору-вперед!',
    successEmoji: '🪜',
  },
  {
    id: 6,
    title: 'Урок 6: Вільний малюнок',
    instruction: '🎨 Малюй що завгодно! Усі напрямки доступні. Зроби <strong>хоча б 6 кроків</strong>.',
    startPos: { x:4, y:3 }, startDir:'E',
    available: ['move_n','move_s','move_e','move_w','repeat'],
    goal: null,  // free draw
    trailColor: '#D4822A',
    successMsg: 'Який чудовий малюнок! Ти справжній художник!',
    successEmoji: '🌟',
  },
];

// ─── BLOCK DEFINITIONS ────────────────────────────────────────────────────────
const BLOCK_DEFS = {
  move_n: { lbl:'рухайся ↑', cls:'move', icon:'⬆', dir:'N', code:'рухайся(↑)' },
  move_s: { lbl:'рухайся ↓', cls:'move', icon:'⬇', dir:'S', code:'рухайся(↓)' },
  move_e: { lbl:'рухайся →', cls:'move', icon:'➡', dir:'E', code:'рухайся(→)' },
  move_w: { lbl:'рухайся ←', cls:'move', icon:'⬅', dir:'W', code:'рухайся(←)' },
  repeat: { lbl:'повтори',   cls:'repeat', icon:'🔁', code:'повтори' },
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let currentLessonIdx = 0;
let currentLesson    = null;
let snail = { x:0, y:0, dir:'E' };
let workspace        = [];          // [{type, id, count?, blocks?}]
let openRepeatId     = null;        // id of repeat block open for input
let idCounter        = 1;
let running          = false;
let doneLessons      = new Set();
let trailPoints      = [];          // array of [x,y] visited

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  buildLessonNav();
  setupGrid();
  loadLesson(0);
}

function buildLessonNav() {
  const nav = document.getElementById('lesson-nav');
  nav.innerHTML = '';
  LESSONS.forEach((l, i) => {
    const d = document.createElement('button');
    d.className = 'ldot' + (i===0?' active':'') + (doneLessons.has(i)?' done':'');
    d.textContent = i + 1;
    d.title = l.title;
    d.onclick = () => loadLesson(i);
    nav.appendChild(d);
  });
}

function setupGrid() {
  const svg = document.getElementById('grid-svg');
  svg.setAttribute('width', GW);
  svg.setAttribute('height', GH);
  svg.setAttribute('viewBox', `0 0 ${GW} ${GH}`);

  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  bg.setAttribute('width', GW); bg.setAttribute('height', GH);
  bg.setAttribute('fill', '#FFFCF5');
  svg.appendChild(bg);

  // Subtle row/col tint
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
        rect.setAttribute('x', c*CELL); rect.setAttribute('y', r*CELL);
        rect.setAttribute('width', CELL); rect.setAttribute('height', CELL);
        rect.setAttribute('fill', 'rgba(0,0,0,.025)');
        svg.appendChild(rect);
      }
    }
  }

  // Grid lines
  for (let c = 0; c <= COLS; c++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', c*CELL); line.setAttribute('y1', 0);
    line.setAttribute('x2', c*CELL); line.setAttribute('y2', GH);
    line.setAttribute('stroke','rgba(180,160,130,.35)');
    line.setAttribute('stroke-width','1');
    svg.appendChild(line);
  }
  for (let r = 0; r <= ROWS; r++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', 0);  line.setAttribute('y1', r*CELL);
    line.setAttribute('x2', GW); line.setAttribute('y2', r*CELL);
    line.setAttribute('stroke','rgba(180,160,130,.35)');
    line.setAttribute('stroke-width','1');
    svg.appendChild(line);
  }

  // Trail canvas
  const tc = document.getElementById('trail-canvas');
  tc.width  = GW;
  tc.height = GH;

  // Snail element
  const se = document.getElementById('snail-el');
  se.style.width  = SSIZE + 'px';
  se.style.height = SSIZE + 'px';
  se.innerHTML = SNAIL_SVG;

  // Avatar
  document.getElementById('avatar-box').innerHTML = AVATAR_SVG;
}

function loadLesson(idx) {
  currentLessonIdx = idx;
  currentLesson    = LESSONS[idx];
  openRepeatId     = null;
  workspace        = [];

  // Header
  document.getElementById('lesson-title').textContent = currentLesson.title;
  document.getElementById('instr-text').innerHTML     = currentLesson.instruction;

  // Nav dots
  document.querySelectorAll('.ldot').forEach((d, i) => {
    d.className = 'ldot'
      + (i === idx ? ' active' : '')
      + (doneLessons.has(i) ? ' done' : '');
  });

  // Palette
  renderPalette();

  // Workspace
  renderWorkspace();

  // Reset snail + trail
  resetTrail();
  placeSSnail();
  hideFeedback();
  document.getElementById('overlay').classList.remove('show');
  setRunning(false);
}

function resetLesson() {
  openRepeatId = null;
  resetTrail();
  placeSSnail();
  hideFeedback();
  setRunning(false);
  renderWorkspace(); // redraw to clear active highlights
}

function resetTrail() {
  const tc  = document.getElementById('trail-canvas');
  const ctx = tc.getContext('2d');
  ctx.clearRect(0, 0, GW, GH);
  trailPoints = [];

  // reset snail state
  const sp = currentLesson.startPos;
  snail = { x: sp.x, y: sp.y, dir: currentLesson.startDir };
}

function placeSSnail() {
  const se  = document.getElementById('snail-el');
  const sp  = currentLesson.startPos;
  snail.x   = sp.x;
  snail.y   = sp.y;
  snail.dir = currentLesson.startDir;

  se.style.transition = 'none';
  se.style.left       = cellPx(snail.x) + 'px';
  se.style.top        = cellPx(snail.y) + 'px';
  se.style.transform  = `rotate(${DIR_ROT[snail.dir]}deg)`;

  // restore transitions after placement
  requestAnimationFrame(() => {
    se.style.transition = 'left .32s ease, top .32s ease, transform .25s ease';
  });
}

function cellPx(v) { return v * CELL + (CELL - SSIZE) / 2; }

// ─── PALETTE ──────────────────────────────────────────────────────────────────
function renderPalette() {
  const container = document.getElementById('pblock-list');
  container.innerHTML = '';
  currentLesson.available.forEach(type => {
    const def = BLOCK_DEFS[type];
    const el  = document.createElement('div');
    el.className    = `pblock ${def.cls}`;
    el.dataset.type = type;
    el.innerHTML    = `<span class="pblock-icon">${def.icon}</span>
                       <span class="pblock-lbl">${def.lbl}</span>`;
    el.onclick = () => addBlock(type);
    container.appendChild(el);
  });
}

// ─── WORKSPACE ────────────────────────────────────────────────────────────────
function nextId() { return idCounter++; }

function addBlock(type) {
  if (running) return;

  if (type === 'repeat') {
    const block = { type:'repeat', id:nextId(), count:3, blocks:[] };
    if (openRepeatId !== null) {
      // Add to open repeat's blocks
      const parent = findBlock(workspace, openRepeatId);
      if (parent) { parent.blocks.push(block); openRepeatId = block.id; }
    } else {
      workspace.push(block);
      openRepeatId = block.id;
    }
  } else {
    const block = { type, id:nextId() };
    if (openRepeatId !== null) {
      const parent = findBlock(workspace, openRepeatId);
      if (parent) parent.blocks.push(block);
      else { workspace.push(block); }
    } else {
      workspace.push(block);
    }
  }
  renderWorkspace();
}

function findBlock(list, id) {
  for (const b of list) {
    if (b.id === id) return b;
    if (b.blocks) { const f = findBlock(b.blocks, id); if (f) return f; }
  }
  return null;
}

function removeBlock(id) {
  if (running) return;
  // Close openRepeat if we're deleting it
  if (openRepeatId === id) openRepeatId = null;
  workspace = removeFromList(workspace, id);
  renderWorkspace();
}

function removeFromList(list, id) {
  return list
    .filter(b => b.id !== id)
    .map(b => b.blocks ? { ...b, blocks: removeFromList(b.blocks, id) } : b);
}

function closeRepeat() {
  openRepeatId = null;
  renderWorkspace();
}

function countBlocks(list) {
  let n = 0;
  for (const b of list) {
    n++;
    if (b.blocks) n += countBlocks(b.blocks);
  }
  return n;
}

function renderWorkspace() {
  const inner = document.getElementById('ws-inner');
  const empty = document.getElementById('ws-empty');

  inner.innerHTML = '';
  if (empty) empty.style.display = workspace.length === 0 ? 'block' : 'none';

  workspace.forEach(b => inner.appendChild(buildBlockEl(b)));

  // If inside a repeat, show visual indicator
  if (openRepeatId !== null) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#A0887A;text-align:center;padding:4px 6px;';
    hint.innerHTML = `🔁 Ти всередині петлі <button onclick="closeRepeat()" style="background:var(--block-rep);color:white;border:none;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:6px;">Закрити</button>`;
    inner.appendChild(hint);
  }

  // Block count
  const total = countBlocks(workspace);
  document.getElementById('block-count').textContent =
    total === 0 ? '0 блоків' : `${total} ${blockWord(total)}`;

  // Update code panel
  updateCode();
}

function blockWord(n) {
  if (n === 1) return 'блок';
  if (n >= 2 && n <= 4) return 'блоки';
  return 'блоків';
}

function buildBlockEl(block) {
  const def = BLOCK_DEFS[block.type];
  const el  = document.createElement('div');
  el.className    = `wb ${def.cls}`;
  el.dataset.id   = block.id;

  if (block.type === 'repeat') {
    el.innerHTML = `
      <div class="wb-row">
        <span>${def.icon} ${def.lbl}</span>
        <span style="display:flex;align-items:center;gap:5px">
          <input class="rep-count" type="number" min="1" max="20"
                 value="${block.count}"
                 onchange="updateRepeatCount(${block.id}, this.value)"
                 onclick="event.stopPropagation()"
                 title="Кількість повторень">
          <span style="font-size:11px;opacity:.8">разів</span>
          <button class="xbtn" onclick="removeBlock(${block.id})" title="Видалити">✕</button>
        </span>
      </div>
      <div class="rep-inner" id="rep-inner-${block.id}">
        ${block.blocks.length === 0
          ? `<div style="font-size:10px;color:rgba(255,255,255,.6);text-align:center;padding:3px">
               натисни блок для додавання всередину
             </div>`
          : block.blocks.map(b => buildBlockEl(b).outerHTML).join('')
        }
      </div>
    `;

    // Highlight if this is the open repeat
    if (openRepeatId === block.id) {
      el.style.outline = '2px solid white';
      el.style.outlineOffset = '2px';
    }

    // Click on repeat inner to make it active
    el.querySelector('.rep-inner').onclick = (e) => {
      e.stopPropagation();
      openRepeatId = block.id;
      renderWorkspace();
    };

  } else {
    el.innerHTML = `
      <div class="wb-row">
        <span>${def.icon} ${def.lbl}</span>
        <button class="xbtn" onclick="removeBlock(${block.id})" title="Видалити">✕</button>
      </div>`;
  }
  return el;
}

function updateRepeatCount(id, val) {
  const b = findBlock(workspace, id);
  if (b) { b.count = Math.max(1, Math.min(20, parseInt(val)||1)); }
  renderWorkspace();
}

// ─── CODE GENERATION ──────────────────────────────────────────────────────────
function blocksToCode(list, indent) {
  let s = '';
  for (const b of list) {
    if (b.type === 'repeat') {
      s += indent + `повтори ${b.count} разів {\n`;
      s += blocksToCode(b.blocks, indent + '  ');
      s += indent + '}\n';
    } else {
      s += indent + BLOCK_DEFS[b.type].code + '\n';
    }
  }
  return s;
}

function updateCode() {
  const code = 'при запуску {\n' + blocksToCode(workspace, '  ') + '}';
  document.getElementById('code-text').textContent = code;
}

function toggleCode() {
  document.getElementById('code-panel').classList.toggle('open');
}

// ─── EXECUTION ────────────────────────────────────────────────────────────────
async function runProgram() {
  if (running) return;
  if (workspace.length === 0) {
    showFeedback('Додай хоча б один блок! 👆', false);
    return;
  }
  setRunning(true);
  hideFeedback();
  resetTrail();
  placeSSnail();

  await sleep(120); // let snail settle

  const actions = flattenBlocks(workspace);
  for (let i = 0; i < actions.length; i++) {
    if (!running) break;
    highlightBlock(actions[i].id);
    await executeStep(actions[i]);
    await sleep(340);
  }

  clearBlockHighlight();
  setRunning(false);
  await sleep(200);
  checkGoal();
}

function flattenBlocks(list) {
  const out = [];
  for (const b of list) {
    if (b.type === 'repeat') {
      for (let i = 0; i < b.count; i++) {
        out.push(...flattenBlocks(b.blocks));
      }
    } else {
      out.push(b);
    }
  }
  return out;
}

async function executeStep(block) {
  const prev = { ...snail };
  if      (block.type === 'move_n') { snail.y -= 1; snail.dir = 'N'; }
  else if (block.type === 'move_s') { snail.y += 1; snail.dir = 'S'; }
  else if (block.type === 'move_e') { snail.x += 1; snail.dir = 'E'; }
  else if (block.type === 'move_w') { snail.x -= 1; snail.dir = 'W'; }

  // Clamp
  snail.x = Math.max(0, Math.min(COLS - 1, snail.x));
  snail.y = Math.max(0, Math.min(ROWS - 1, snail.y));

  // Move snail element
  const se = document.getElementById('snail-el');
  se.style.left      = cellPx(snail.x) + 'px';
  se.style.top       = cellPx(snail.y) + 'px';
  se.style.transform = `rotate(${DIR_ROT[snail.dir]}deg)`;

  // Draw trail
  drawTrailLine(prev.x, prev.y, snail.x, snail.y);
  trailPoints.push([snail.x, snail.y]);
}

function drawTrailLine(x1, y1, x2, y2) {
  const tc  = document.getElementById('trail-canvas');
  const ctx = tc.getContext('2d');
  const cx1 = x1 * CELL + CELL/2;
  const cy1 = y1 * CELL + CELL/2;
  const cx2 = x2 * CELL + CELL/2;
  const cy2 = y2 * CELL + CELL/2;

  ctx.save();
  ctx.strokeStyle = currentLesson.trailColor;
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.shadowColor = currentLesson.trailColor;
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.moveTo(cx1, cy1);
  ctx.lineTo(cx2, cy2);
  ctx.stroke();

  // dot at new position
  ctx.fillStyle  = currentLesson.trailColor;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx2, cy2, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function highlightBlock(id) {
  document.querySelectorAll('.wb').forEach(el => {
    el.classList.toggle('active-block', parseInt(el.dataset.id) === id);
  });
}
function clearBlockHighlight() {
  document.querySelectorAll('.wb').forEach(el => el.classList.remove('active-block'));
}

// ─── GOAL CHECKING ────────────────────────────────────────────────────────────
function checkGoal() {
  const lesson = currentLesson;

  if (!lesson.goal) {
    // free draw
    if (trailPoints.length >= 6) {
      showSuccess();
    } else {
      showFeedback('Намалюй більше! Зроби хоча б 6 кроків 🖌️', false);
    }
    return;
  }

  const visited = new Set(trailPoints.map(([x,y]) => `${x},${y}`));
  const ok = lesson.goal.every(([gx,gy]) => visited.has(`${gx},${gy}`));

  if (ok) {
    showSuccess();
  } else {
    showFeedback('Майже! Перевір напрямок та кількість кроків 💪', false);
  }
}

function showSuccess() {
  doneLessons.add(currentLessonIdx);
  buildLessonNav();

  const ov  = document.getElementById('overlay');
  const btn = document.getElementById('btn-next');
  document.getElementById('success-title').textContent = currentLesson.successEmoji + ' Чудово!';
  document.getElementById('success-msg').textContent   = currentLesson.successMsg;

  const isLast = currentLessonIdx === LESSONS.length - 1;
  btn.textContent = isLast ? '🏁 Завершити' : 'Далі →';
  ov.classList.add('show');

  // Snail wiggle animation
  const se = document.getElementById('snail-el');
  se.style.animation = 'wiggle .4s ease 3';
}

function nextLesson() {
  document.getElementById('overlay').classList.remove('show');
  if (currentLessonIdx < LESSONS.length - 1) {
    loadLesson(currentLessonIdx + 1);
  } else {
    loadLesson(0);
  }
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function setRunning(v) {
  running = v;
  document.getElementById('btn-run').disabled   = v;
  document.getElementById('btn-reset').disabled = v;
}

function showFeedback(msg, ok) {
  const el = document.getElementById('feedback');
  el.textContent = msg;
  el.className   = 'show ' + (ok ? 'ok' : 'err');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3800);
}

function hideFeedback() {
  document.getElementById('feedback').className = '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── SNAIL WIGGLE ─────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
@keyframes wiggle {
  0%,100%{transform:rotate(${0}deg) scale(1)}
  25%{transform:rotate(10deg) scale(1.1)}
  75%{transform:rotate(-10deg) scale(1.1)}
}`;
document.head.appendChild(style);

// ─── START ────────────────────────────────────────────────────────────────────
init();
