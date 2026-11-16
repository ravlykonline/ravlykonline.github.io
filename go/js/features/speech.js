export function createTaskSpeech({
  windowRef = globalThis.window,
  onStart,
  onEnd,
  onError
}) {
  let activePlayer = null;

  function stop() {
    const previous = activePlayer;
    activePlayer = null;
    previous?.pause();
    return previous !== null;
  }

  function play(levelId) {
    stop();
    if (typeof windowRef?.Audio !== 'function' || !Number.isInteger(levelId) || levelId < 1) {
      return false;
    }

    const player = new windowRef.Audio(`./assets/voice/${levelId}.mp3`);
    activePlayer = player;

    function finish(callback) {
      if (activePlayer === player) {
        activePlayer = null;
        callback();
      }
    }

    player.addEventListener('playing', () => {
      if (activePlayer === player) {
        onStart();
      }
    }, { once: true });
    player.addEventListener('ended', () => finish(onEnd), { once: true });
    player.addEventListener('error', () => finish(onError), { once: true });

    try {
      Promise.resolve(player.play()).catch(() => finish(onError));
    } catch {
      finish(onError);
    }
    return true;
  }

  return { play, stop };
}
