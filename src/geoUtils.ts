export interface LatLng {
  lat: number;
  lng: number;
}

export const FALLBACK_LOC: LatLng = { lat: 28.6692, lng: 77.4538 }; // Ghaziabad/Delhi area

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function offsetLatLng(lat: number, lng: number, distKm: number, bearingDeg: number): LatLng {
  const R = 6371;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distKm / R) +
      Math.cos(lat1) * Math.sin(distKm / R) * Math.cos(brng)
  );
  
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distKm / R) * Math.cos(lat1),
      Math.cos(distKm / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    
  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "LocalMartApp/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    return (
      a.suburb ||
      a.neighbourhood ||
      a.city_district ||
      a.town ||
      a.city ||
      a.county ||
      a.state_district ||
      a.state ||
      null
    );
  } catch {
    return null;
  }
}
