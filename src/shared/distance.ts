/**
 * Calculate distance between two points on the Travian map.
 * ROF x3 wraps at the map edge (-200..200 => 401 tiles).
 */
export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  mapSize = 401
): number {
  const dx = calculateWrappedAxisDistance(x1, x2, mapSize);
  const dy = calculateWrappedAxisDistance(y1, y2, mapSize);

  return Math.sqrt(dx * dx + dy * dy);
}

function calculateWrappedAxisDistance(from: number, to: number, mapSize: number): number {
  const directDistance = Math.abs(to - from);

  return Math.min(directDistance, mapSize - directDistance);
}
