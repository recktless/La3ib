/**
 * Kuwait Geographical Constants & Boundary Validation
 * 
 * Provides official Kuwait bounding coordinates, camera restrictions for Google Maps,
 * and an authoritative ray-casting point-in-polygon algorithm to validate that
 * coordinates lie strictly within Kuwait territory (including mainland Kuwait,
 * Failaka Island, Boubyan Island, and relevant coastal recreation areas).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Camera restriction bounds for Google Maps instances in La3ib.
 * Configured so users cannot pan outside Kuwait into Iraq or Saudi Arabia.
 */
export const KUWAIT_CAMERA_BOUNDS: LatLngBoundsLiteral = {
  north: 30.15, // Northern border (Abdali, Warbah island)
  south: 28.50, // Southern border (Nuwaiseeb, Wafra)
  west: 46.50,  // Western border (Salmi)
  east: 48.60   // Eastern territorial coastline & Failaka island
};

/**
 * Zoom constraints for Kuwait Maps.
 * minZoom prevents zooming out to the wider Middle East / globe.
 */
export const KUWAIT_MIN_ZOOM = 8.5;
export const KUWAIT_MAX_ZOOM = 19;
export const KUWAIT_DEFAULT_ZOOM = 11;
export const KUWAIT_DEFAULT_CENTER: LatLng = {
  lat: 29.3759,
  lng: 47.9774
};

/**
 * Standard Google Maps restriction config object for `<Map>` props.
 */
export const KUWAIT_MAP_RESTRICTION = {
  latLngBounds: KUWAIT_CAMERA_BOUNDS,
  strictBounds: true
} as const;

/**
 * Detailed polygon vertices [latitude, longitude] outlining mainland Kuwait,
 * Boubyan Island, Warbah Island, and the coastal perimeter.
 */
export const KUWAIT_MAINLAND_POLYGON: [number, number][] = [
  // Nuwaiseeb south-eastern border with Saudi Arabia
  [28.524, 48.415],
  // Southern border extending westward south of Wafra
  [28.524, 48.000],
  [28.524, 47.600],
  [28.700, 47.300],
  [28.980, 47.050], // Neutral zone border intersection
  [29.100, 46.600], // Southern approach to Salmi
  [29.350, 46.550], // Westernmost border point near Salmi
  // Northwestern border with Iraq along Wadi Al-Batin
  [29.500, 46.750],
  [29.750, 47.100],
  [29.950, 47.380],
  [30.060, 47.480], // Tri-point border near Batin
  // Northern border with Iraq (Abdali)
  [30.095, 47.700],
  [30.105, 47.750], // Abdali border crossing
  [30.080, 47.920],
  [30.040, 47.980], // Umm Qasr channel
  // Warbah & Boubyan islands
  [30.075, 48.040],
  [30.110, 48.120], // Warbah island
  [30.060, 48.220],
  [29.980, 48.360], // Northeastern Boubyan
  [29.750, 48.420], // Eastern Boubyan coast
  [29.550, 48.360], // Southeastern Boubyan
  // Eastern coastline heading south
  [29.480, 48.300], // Kuwait Bay approach
  [29.400, 48.050], // Kuwait City / Sharq coast
  [29.350, 48.120], // Ras Salmiya
  [29.170, 48.180], // Fintas & Abu Hasaniya
  [29.050, 48.200], // Fahaheel & Ahmadi
  [28.950, 48.250], // Mina Abdullah
  [28.740, 48.350], // Ras Az-Zour
  [28.620, 48.440], // Sabah Al Ahmad Sea City & Khiran
  [28.524, 48.415]  // Closing back to Nuwaiseeb
];

/**
 * Failaka Island and surrounding islands (Miskan, Auhah) polygon vertices.
 */
export const KUWAIT_FAILAKA_POLYGON: [number, number][] = [
  [29.350, 48.220],
  [29.350, 48.480],
  [29.520, 48.480],
  [29.520, 48.220],
  [29.350, 48.220]
];

/**
 * Ray-casting algorithm to test whether a given [lat, lng] point lies
 * inside a polygon ring.
 */
function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validates whether a pair of coordinates (latitude, longitude) is strictly
 * inside Kuwait sovereign territory (mainland, islands, and coastal venues).
 * 
 * NOTE ON SECURITY AUDIT:
 * This is client-side boundary validation to safeguard UX and map pinning.
 * Direct Firestore writes or API requests bypass client checks unless enforced
 * via Firestore Security Rules or Cloud Functions.
 */
export function isLocationInKuwait(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;

  // Fast outer bounding box check first
  if (
    lat < KUWAIT_CAMERA_BOUNDS.south ||
    lat > KUWAIT_CAMERA_BOUNDS.north ||
    lng < KUWAIT_CAMERA_BOUNDS.west ||
    lng > KUWAIT_CAMERA_BOUNDS.east
  ) {
    return false;
  }

  // Precise polygon ray-casting: mainland or Failaka / islands
  return (
    isPointInPolygon(lat, lng, KUWAIT_MAINLAND_POLYGON) ||
    isPointInPolygon(lat, lng, KUWAIT_FAILAKA_POLYGON)
  );
}

/**
 * Helper to get localized error message for invalid Kuwait coordinates
 */
export function getKuwaitLocationError(language: string = 'en'): string {
  return language === 'ar'
    ? 'يجب أن يكون الموقع المختار داخل دولة الكويت.'
    : 'Selected location must be within Kuwait.';
}
