import { useState } from 'react';

// Browser geolocation with explicit states the interface can explain.
export function useGeolocate() {
  const [state, setState] = useState({ status: 'idle' });

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        status: 'found',
        point: { lat: pos.coords.latitude, lon: pos.coords.longitude },
      }),
      (error) => setState({ status: error.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 },
    );
  };

  return { ...state, locate };
}

export const geoMessageKey = (status) => ({
  locating: 'locating',
  found: 'locFound',
  denied: 'locDenied',
  unsupported: 'locUnsupported',
  unavailable: 'locUnavailable',
}[status] ?? null);
