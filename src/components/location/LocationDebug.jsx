import { areasByDistance } from '../../utils/geolocation.js';
import s from './LocationDebug.module.css';

/**
 * Development only: what the phone reported and how far each nearby area is.
 *
 * Lives in the form rather than inside the "Use my location" button, because
 * a successful detection replaces the button with the area chip — and the
 * readings disappeared with it, in exactly the case worth checking.
 *
 * Render it behind `import.meta.env.DEV`; production builds drop it entirely.
 */
export default function LocationDebug({ reading }) {
  if (!reading) return null;
  const nearest = areasByDistance(reading).slice(0, 3);
  return (
    <dl className={s.debug} aria-label="Location debug">
      <dt>lat, lng</dt>
      <dd>
        {reading.lat.toFixed(5)}, {reading.lng.toFixed(5)}
      </dd>
      <dt>accuracy</dt>
      <dd>{Math.round(reading.accuracy)} m</dd>
      {nearest.map(({ area, distanceKm }) => (
        <div key={area.id} className={s.row}>
          <dt>{area.name}</dt>
          <dd>
            {distanceKm.toFixed(2)} km (radius {area.radiusKm} km)
          </dd>
        </div>
      ))}
    </dl>
  );
}
