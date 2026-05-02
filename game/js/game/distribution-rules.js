export function shuffleWithRandom(items, random = Math.random) {
    const shuffled = items.slice();

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
}

export function createDistributionCells({
    count,
    width,
    height,
    padding = 0,
    random = Math.random
}) {
    const safeCount = Math.max(1, count);
    const usableWidth = Math.max(1, width - padding * 2);
    const usableHeight = Math.max(1, height - padding * 2);
    const aspectRatio = usableWidth / usableHeight;
    const columns = Math.max(1, Math.ceil(Math.sqrt(safeCount * aspectRatio)));
    const rows = Math.max(1, Math.ceil(safeCount / columns));
    const cellWidth = usableWidth / columns;
    const cellHeight = usableHeight / rows;
    const cells = [];

    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            cells.push({
                x: padding + column * cellWidth,
                y: padding + row * cellHeight,
                w: cellWidth,
                h: cellHeight
            });
        }
    }

    return shuffleWithRandom(cells, random);
}

export function positionRectInCell(rect, cell, random = Math.random, jitter = 0.78) {
    const emptyX = Math.max(0, cell.w - rect.w);
    const emptyY = Math.max(0, cell.h - rect.h);
    const insetX = emptyX * (1 - jitter) / 2;
    const insetY = emptyY * (1 - jitter) / 2;
    const rangeX = emptyX * jitter;
    const rangeY = emptyY * jitter;

    return {
        x: cell.x + insetX + random() * rangeX,
        y: cell.y + insetY + random() * rangeY
    };
}
