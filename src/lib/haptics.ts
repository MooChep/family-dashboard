/** Vibration courte — confirmation d'action swipe. */
export function hapticLight(): void {
  if ('vibrate' in navigator) navigator.vibrate(10)
}

/** Vibration double — action positive complétée (DONE, archivé…). */
export function hapticSuccess(): void {
  if ('vibrate' in navigator) navigator.vibrate([10, 50, 10])
}
