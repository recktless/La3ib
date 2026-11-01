/**
 * Kuwait Geographical & Location Utilities for La3ib
 * Supports interactive map coordinates, WGS84 latitude/longitude conversion,
 * human-readable location labeling, and external maps navigation links.
 */

export interface KuwaitBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Bounding box for Kuwait state geography
export const KUWAIT_BOUNDS: KuwaitBounds = {
  minLat: 28.520, // Southern border (Wafra/Nuwaiseeb)
  maxLat: 30.100, // Northern border (Abdali)
  minLng: 46.550, // Western border (Salmi)
  maxLng: 48.420  // Eastern coastline (Arabian Gulf)
};

export interface KuwaitLandmark {
  name: string;
  nameAr: string;
  area: string;
  areaAr: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export const KUWAIT_SPORTS_HUBS: KuwaitLandmark[] = [
  {
    name: 'Mishref Youth Center Stadium',
    nameAr: 'مركز شباب مشرف',
    area: 'Mishref',
    areaAr: 'مشرف',
    lat: 29.2731,
    lng: 48.0536,
    x: 55,
    y: 52
  },
  {
    name: 'Padel In - Shuwaikh Industrial',
    nameAr: 'بادل إن - الشويخ',
    area: 'Shuwaikh',
    areaAr: 'الشويخ',
    lat: 29.3519,
    lng: 47.9422,
    x: 42,
    y: 38
  },
  {
    name: 'Salmiya Sports Club Courts',
    nameAr: 'نادي السالمية الرياضي',
    area: 'Salmiya',
    areaAr: 'السالمية',
    lat: 29.3333,
    lng: 48.0772,
    x: 68,
    y: 44
  },
  {
    name: 'Yarmouk Club Premium Padel',
    nameAr: 'نادي اليرموك الرياضي',
    area: 'Yarmouk',
    areaAr: 'اليرموك',
    lat: 29.3100,
    lng: 47.9800,
    x: 48,
    y: 48
  },
  {
    name: 'The Village Basketball Court',
    nameAr: 'ملاعب ذا فيلج - أبو الحصانية',
    area: 'Abu Hasaniya',
    areaAr: 'أبو الحصانية',
    lat: 29.1800,
    lng: 48.1100,
    x: 72,
    y: 70
  },
  {
    name: 'Marina Beach Volleyball Arena',
    nameAr: 'شاطئ مارينا للكرة الطائرة',
    area: 'Salmiya',
    areaAr: 'السالمية',
    lat: 29.3400,
    lng: 48.0650,
    x: 74,
    y: 40
  },
  {
    name: 'Kuwait City Olympic Courts',
    nameAr: 'ملاعب العاصمة الأولمبية',
    area: 'Kuwait City',
    areaAr: 'مدينة الكويت',
    lat: 29.3759,
    lng: 47.9774,
    x: 50,
    y: 34
  },
  {
    name: 'Hawalli Sports Center',
    nameAr: 'مركز حولي الرياضي',
    area: 'Hawalli',
    areaAr: 'حولي',
    lat: 29.3411,
    lng: 48.0125,
    x: 58,
    y: 42
  },
  {
    name: 'Jahra Sports Club Stadium',
    nameAr: 'ملعب نادي الجهراء الرياضي',
    area: 'Jahra',
    areaAr: 'الجهراء',
    lat: 29.3375,
    lng: 47.6581,
    x: 26,
    y: 45
  },
  {
    name: 'Ardhiya Youth Arena',
    nameAr: 'ملاعب العارضية الرياضية',
    area: 'Ardhiya',
    areaAr: 'العارضية',
    lat: 29.2980,
    lng: 47.9250,
    x: 44,
    y: 49
  },
  {
    name: 'Sabah Al-Salem Sports Complex',
    nameAr: 'مجمع صباح السالم الرياضي',
    area: 'Sabah Al-Salem',
    areaAr: 'صباح السالم',
    lat: 29.2500,
    lng: 48.0800,
    x: 65,
    y: 56
  },
  {
    name: 'Mahboula Coastal Arena',
    nameAr: 'ملاعب المهبولة الساحلية',
    area: 'Mahboula',
    areaAr: 'المهبولة',
    lat: 29.1450,
    lng: 48.1250,
    x: 75,
    y: 76
  }
];

/**
 * Converts relative map percentage coordinates (0-100%) to standard WGS84 Latitude & Longitude.
 */
export function coordinatesToLatLng(coords: { x: number; y: number }): { latitude: number; longitude: number } {
  const clampX = Math.max(0, Math.min(100, coords.x));
  const clampY = Math.max(0, Math.min(100, coords.y));

  // In standard cartesian UI projection:
  // x: 0% is Western Kuwait (minLng), 100% is Eastern Kuwait (maxLng)
  // y: 0% is Northern Kuwait (maxLat), 100% is Southern Kuwait (minLat)
  const lng = KUWAIT_BOUNDS.minLng + (clampX / 100) * (KUWAIT_BOUNDS.maxLng - KUWAIT_BOUNDS.minLng);
  const lat = KUWAIT_BOUNDS.maxLat - (clampY / 100) * (KUWAIT_BOUNDS.maxLat - KUWAIT_BOUNDS.minLat);

  return {
    latitude: parseFloat(lat.toFixed(5)),
    longitude: parseFloat(lng.toFixed(5))
  };
}

/**
 * Converts WGS84 Latitude & Longitude to relative map percentage coordinates (0-100%).
 */
export function latLngToCoordinates(lat: number, lng: number): { x: number; y: number } {
  const clampLat = Math.max(KUWAIT_BOUNDS.minLat, Math.min(KUWAIT_BOUNDS.maxLat, lat));
  const clampLng = Math.max(KUWAIT_BOUNDS.minLng, Math.min(KUWAIT_BOUNDS.maxLng, lng));

  const x = ((clampLng - KUWAIT_BOUNDS.minLng) / (KUWAIT_BOUNDS.maxLng - KUWAIT_BOUNDS.minLng)) * 100;
  const y = ((KUWAIT_BOUNDS.maxLat - clampLat) / (KUWAIT_BOUNDS.maxLat - KUWAIT_BOUNDS.minLat)) * 100;

  return {
    x: Math.round(Math.max(2, Math.min(98, x))),
    y: Math.round(Math.max(2, Math.min(98, y)))
  };
}

/**
 * Finds the nearest Kuwait area/landmark label given coordinates or LatLng.
 */
export function getNearestKuwaitLocation(
  loc: { x: number; y: number } | { latitude: number; longitude: number }
): { name: string; nameAr: string; area: string; areaAr: string } {
  let lat: number;
  let lng: number;

  if ('latitude' in loc && typeof loc.latitude === 'number') {
    lat = loc.latitude;
    lng = loc.longitude;
  } else if ('x' in loc && typeof loc.x === 'number') {
    const latLng = coordinatesToLatLng(loc);
    lat = latLng.latitude;
    lng = latLng.longitude;
  } else {
    return {
      name: 'Kuwait City Sports Area',
      nameAr: 'منطقة العاصمة الرياضية',
      area: 'Kuwait City',
      areaAr: 'مدينة الكويت'
    };
  }

  let minDistance = Infinity;
  let closest = KUWAIT_SPORTS_HUBS[0];

  for (const hub of KUWAIT_SPORTS_HUBS) {
    const dLat = hub.lat - lat;
    const dLng = hub.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = hub;
    }
  }

  return {
    name: closest.name,
    nameAr: closest.nameAr,
    area: closest.area,
    areaAr: closest.areaAr
  };
}

/**
 * Formats Latitude and Longitude for UI display (e.g. "29.27310° N, 48.05360° E").
 */
export function formatLatLngDisplay(latitude?: number | null, longitude?: number | null): string {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    return '';
  }
  const latStr = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

/**
 * Generates an external Google Maps search URL with exact coordinates.
 */
export function getGoogleMapsUrl(latitude: number, longitude: number, label?: string): string {
  const query = label ? `${latitude},${longitude} (${encodeURIComponent(label)})` : `${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Generates an external Apple Maps URL with exact coordinates.
 */
export function getAppleMapsUrl(latitude: number, longitude: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${latitude},${longitude}`;
  return `https://maps.apple.com/?q=${q}&ll=${latitude},${longitude}`;
}

/**
 * Ensures backwards compatibility for legacy games that might only have { x, y } coordinates,
 * or games created with lat/lng. Always returns both representations and a readable label.
 */
export function resolveGameLocation(game: {
  coordinates?: { x: number; y: number } | null;
  latitude?: number | null;
  longitude?: number | null;
  area?: string | null;
  courtName?: string | null;
  address?: string | null;
  locationLabel?: string | null;
}): {
  coordinates: { x: number; y: number };
  latitude: number;
  longitude: number;
  locationLabel: string;
  mapsUrl: string;
} {
  let coords = game.coordinates;
  let lat = game.latitude;
  let lng = game.longitude;

  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    if (!coords || typeof coords.x !== 'number' || typeof coords.y !== 'number') {
      coords = latLngToCoordinates(lat, lng);
    }
  } else if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
    const converted = coordinatesToLatLng(coords);
    lat = converted.latitude;
    lng = converted.longitude;
  } else {
    // Default to Kuwait Center (Mishref area)
    coords = { x: 55, y: 52 };
    lat = 29.2731;
    lng = 48.0536;
  }

  const nearest = getNearestKuwaitLocation({ latitude: lat, longitude: lng });
  const label = game.locationLabel || game.address || `${game.courtName || nearest.name}, ${game.area || nearest.area}`;

  return {
    coordinates: coords,
    latitude: lat,
    longitude: lng,
    locationLabel: label,
    mapsUrl: getGoogleMapsUrl(lat, lng, game.courtName || nearest.name)
  };
}
