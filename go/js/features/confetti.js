const CONFETTI_COLORS = ['#3a7d44', '#e8623a', '#f5c842', '#5b9cf6', '#e86fa3', '#a3d977', '#ff9966', '#1a6fc2'];

function prefersReducedMotion(windowRef) {
  return !!windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function randomBetween(min, max, random) {
  return min + random() * (max - min);
}

export function launchConfetti(options = {}) {
  const {
    count = 75,
    documentRef = globalThis.document,
    durationMs = 3800,
    random = Math.random,
    root,
    windowRef = globalThis.window
  } = options;
  const confettiRoot = root || documentRef?.getElementById('confetti');

  if (!confettiRoot || !documentRef || !windowRef || prefersReducedMotion(windowRef)) {
    return false;
  }

  const pieces = [];
  confettiRoot.replaceChildren();

  for (let i = 0; i < count; i += 1) {
    const part = documentRef.createElement('div');
    part.className = 'cp';
    part.style.left = `${random() * 100}vw`;
    part.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    part.style.width = `${randomBetween(6, 15, random)}px`;
    part.style.height = `${randomBetween(10, 22, random)}px`;
    part.style.borderRadius = random() > 0.5 ? '50%' : '3px';
    part.style.transform = `rotate(${random() * 360}deg)`;
    part.style.animationDuration = `${randomBetween(1.1, 3, random)}s`;
    part.style.animationDelay = `${random() * 0.5}s`;
    part.style.opacity = '.9';
    pieces.push(part);
  }

  confettiRoot.append(...pieces);
  windowRef.setTimeout(() => {
    confettiRoot.replaceChildren();
  }, durationMs);
  return true;
}
