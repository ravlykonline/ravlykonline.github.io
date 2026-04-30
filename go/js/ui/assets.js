export function assetPath(filename) {
  return `./assets/${filename}`;
}

export function assetClassName(className) {
  return ['asset-icon', className].filter(Boolean).join(' ');
}

export function createAssetIcon({ className, documentRef = document, filename }) {
  const img = documentRef.createElement('img');
  img.src = assetPath(filename);
  img.className = assetClassName(className);
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.draggable = false;
  return img;
}

export function createTileIconByDir({ className = 'tile-icon', documentRef = document, dir, tileDefs }) {
  const tileDef = tileDefs.find((item) => item.dir === dir);
  if (!tileDef) {
    return null;
  }

  return createAssetIcon({
    className,
    documentRef,
    filename: tileDef.iconFile
  });
}
