/**
 * Converts a conventional horizon-relative elevation in degrees to Drei
 * Sky's normalized inclination. Drei maps 0.5 to the horizon and a full
 * normalized turn to 360 degrees; feeding `elevation / 90` puts a 12 degree
 * morning sun roughly 66 degrees below the horizon.
 */
export function skyInclinationFromElevation(elevationDegrees: number): number {
  return 0.5 + elevationDegrees / 180;
}

