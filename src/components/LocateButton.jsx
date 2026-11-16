import { useEffect, useId, useRef } from 'react';
import Icon from './Icons';
import { useGeolocate, geoMessageKey } from '../lib/useGeolocate';
import { nearestPlace } from '../lib/places';
import { useLang } from '../i18n';

// Asks the browser for the farmer's position. The report is honest about what
// happened: found, refused, unavailable, or unsupported.
export default function LocateButton({
  className = 'btn btn-primary',
  onLocated,
  showMessage = true,
  children,
  label,
}) {
  const { t } = useLang();
  const geo = useGeolocate();
  const handled = useRef(false);
  const messageId = useId();

  useEffect(() => {
    if (geo.status !== 'found' || handled.current) return;
    handled.current = true;
    if (onLocated) {
      onLocated(geo.point);
      return;
    }
    const place = nearestPlace(geo.point);
    const ref = `${geo.point.lat.toFixed(5)},${geo.point.lon.toFixed(5)}`;
    window.location.hash = `#/dashboard/map?loc=${place.id}&ref=${ref}`;
  }, [geo.status, geo.point, onLocated]);

  const key = geoMessageKey(geo.status);
  return (
    <div className="locate-block">
      <button
        type="button"
        className={className}
        onClick={() => { handled.current = false; geo.locate(); }}
        disabled={geo.status === 'locating'}
        aria-describedby={showMessage && key ? messageId : undefined}
      >
        <Icon name={geo.status === 'locating' ? 'target' : 'pin'} />
        {children ?? label ?? t.locate}
      </button>
      {showMessage && key && (
        <p
          id={messageId}
          className={`locate-msg locate-${geo.status}`}
          role="status"
          aria-live="polite"
        >
          {t[key]}
        </p>
      )}
    </div>
  );
}
