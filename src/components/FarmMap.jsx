import { useEffect } from 'react';
import {
  MapContainer, TileLayer, Rectangle, Circle, CircleMarker, Tooltip, Popup,
  useMap, useMapEvents,
} from 'react-leaflet';
import { useLang } from '../i18n';
import { placeName } from '../lib/places';
import { CATEGORY_STYLE } from '../lib/categories';

function ClickCatcher({ onMapClick }) {
  useMapEvents({
    click: (event) => onMapClick({ lat: event.latlng.lat, lon: event.latlng.lng }),
  });
  return null;
}

function FlyToPlace({ place, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([place.lat, place.lon], zoom, { duration: 0.8 });
  }, [map, place.id, place.lat, place.lon, zoom]);
  return null;
}

export default function FarmMap({
  place,
  refPoint,
  nearby = [],
  suppliers = [],
  cells = [],
  suppliersOn = false,
  onMapClick,
  zoom = 11,
}) {
  const { t, lang } = useLang();

  return (
    <MapContainer
      center={[place.lat, place.lon]}
      zoom={zoom}
      className="farm-map"
      scrollWheelZoom={false}
      worldCopyJump
      aria-label={t.mapTitle}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToPlace place={place} zoom={zoom} />
      <ClickCatcher onMapClick={onMapClick} />

      {cells.map((cell) => (
        <Rectangle
          key={`${cell.row}-${cell.col}`}
          bounds={cell.bounds}
          pathOptions={{ stroke: false, fillColor: cell.color, fillOpacity: 0.68 }}
          interactive={false}
        />
      ))}

      <Circle
        center={[place.lat, place.lon]}
        radius={place.radiusKm * 1000}
        pathOptions={{ color: '#1E2B22', weight: 2, dashArray: '6 6', fill: false }}
      >
        <Tooltip direction="top">{t.mapStudyPin}</Tooltip>
      </Circle>

      <CircleMarker
        center={[place.lat, place.lon]}
        radius={7}
        pathOptions={{ color: '#1E2B22', weight: 3, fillColor: '#FFFFFF', fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -6]} className="map-label">
          {placeName(place, lang)}
        </Tooltip>
      </CircleMarker>

      <CircleMarker
        center={[refPoint.lat, refPoint.lon]}
        radius={10}
        pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#1E2B22', fillOpacity: 1 }}
      >
        <Tooltip direction="top" offset={[0, -8]}>{t.mapYourPin}</Tooltip>
      </CircleMarker>

      {suppliersOn && suppliers.map((supplier) => {
        const style = CATEGORY_STYLE[supplier.category] ?? CATEGORY_STYLE.supplies;
        return (
          <CircleMarker
            key={supplier.id}
            center={[supplier.lat, supplier.lon]}
            radius={6}
            pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: style.color, fillOpacity: 1 }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{lang === 'ar' ? supplier.nameAr : supplier.name}</strong>
                <span>{t[style.key]} · {t.distanceFromArea(Math.round(supplier.distanceKm))}</span>
                <span>{t.supplierSimulated}</span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {nearby.slice(0, 6).map((item) => (
        <CircleMarker
          key={item.id}
          center={[item.lat, item.lon]}
          radius={4}
          pathOptions={{ color: '#1F6FA8', weight: 2, fillColor: '#FFFFFF', fillOpacity: 1 }}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}
