// Shared across every open dialog: the page scrolls again once the last one closes.
let count = 0;
export function lockScroll() {
  count++;
  document.documentElement.classList.add('scroll-locked');
}
export function unlockScroll() {
  count = Math.max(0, count - 1);
  if (!count) document.documentElement.classList.remove('scroll-locked');
}
