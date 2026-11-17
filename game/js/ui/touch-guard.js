/**
 * Захист від випадкових жестів на планшетах: щипок-масштаб, виділення тексту
 * довгим дотиком і контекстне меню. Зум із клавіатури та режим «Aa» лишаються.
 */
const guarded = new WeakSet();

export function installTouchGuard(documentRef = document) {
    if (guarded.has(documentRef)) {
        return;
    }
    guarded.add(documentRef);

    for (const gesture of ['gesturestart', 'gesturechange', 'gestureend']) {
        documentRef.addEventListener(gesture, (event) => event.preventDefault());
    }
    documentRef.addEventListener('contextmenu', (event) => event.preventDefault());
    documentRef.addEventListener('selectstart', (event) => event.preventDefault());
    documentRef.addEventListener('touchmove', (event) => {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
}
