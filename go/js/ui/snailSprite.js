const FACES = ['neutral', 'happy', 'sad', 'eat'];

// Обличчя Равлика — прозорі накладки; потрібну показує data-mood на #snail (див. game.css).
export function createSnailSprite({ createAssetIcon, documentRef = document }) {
  const sprite = documentRef.createElement('span');
  sprite.className = 'snail-sprite';
  sprite.append(
    createAssetIcon('snail.svg', 'board-icon board-icon-snail'),
    ...FACES.map((face) => createAssetIcon(`snail-face-${face}.svg`, `snail-face face-${face}`))
  );
  return sprite;
}
