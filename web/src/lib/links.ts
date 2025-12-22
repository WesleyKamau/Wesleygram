export function isPlainLeftClick(e: React.MouseEvent): boolean {
  // Left button only, no modifier keys
  return (
    e.button === 0 &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey
  );
}

export function navigateOnPlainLeftClick(
  e: React.MouseEvent,
  navigate: () => void
): void {
  if (!isPlainLeftClick(e)) return;
  e.preventDefault();
  navigate();
}
