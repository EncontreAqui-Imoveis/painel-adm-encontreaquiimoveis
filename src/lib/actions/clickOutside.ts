export function clickOutside(
  node: HTMLElement,
  onOutside: (event: PointerEvent) => void
) {
  let callback = onOutside;

  function handlePointerDown(event: PointerEvent) {
    if (node.contains(event.target as Node)) return;
    callback(event);
  }

  document.addEventListener('pointerdown', handlePointerDown, true);

  return {
    update(nextCallback: (event: PointerEvent) => void) {
      callback = nextCallback;
    },
    destroy() {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    },
  };
}
