import { useEffect, useRef, useState } from 'react';
import { deviceKind, distanceKm, serviceAreaVerdict } from '../utils/geolocation.js';
import { PLACE_POINTS, SERVICE_AREA } from '../data/serviceArea.js';
import s from './LocationCheck.module.css';

/**
 * /location-check — what this device actually reports, live.
 *
 * "GPS isn't finding me" has several different causes that look identical
 * from inside the app: a laptop with no GPS chip guessing from wifi, a phone
 * indoors on its network fix, location switched off at the OS level, or an
 * insecure http:// address where the browser refuses outright. This page
 * shows the raw readings as they arrive, so the cause is visible instead of
 * guessed at — no sign-in, nothing stored, nothing sent anywhere.
 *
 * Deliberately not linked from the app. It is for whoever is setting up or
 * supporting Zevio, and for "send me a screenshot of this page".
 */

const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
const fmtAcc = (m) => (m >= 1000 ? `±${(m / 1000).toFixed(1)} km` : `±${Math.round(m)} m`);

function nearestVillage(lat, lng) {
  let best = null;
  for (const [id, p] of Object.entries(PLACE_POINTS)) {
    const km = distanceKm(p, { lat, lng });
    if (!best || km < best.km) best = { id, km };
  }
  return best;
}

export default function LocationCheck() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('checking…');
  const [running, setRunning] = useState(false);
  const watchRef = useRef(null);
  const startedAt = useRef(0);

  const secure = typeof window !== 'undefined' && window.isSecureContext;
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const device = deviceKind();

  useEffect(() => {
    document.title = 'Location check — Zevio';
    let status;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((st) => {
        status = st;
        setPermission(st.state);
        st.onchange = () => setPermission(st.state);
      })
      .catch(() => setPermission('unknown (browser does not say)'));
    return () => {
      if (status) status.onchange = null;
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const start = () => {
    setError(null);
    setReadings([]);
    setRunning(true);
    startedAt.current = Date.now();
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setReadings((list) => [
          { lat, lng, accuracy, at: Date.now() - startedAt.current, age: Date.now() - pos.timestamp },
          ...list,
        ].slice(0, 30));
      },
      (err) => setError(`${['', 'PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT'][err.code] || 'ERROR'}: ${err.message}`),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  };

  const stop = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setRunning(false);
  };

  const best = readings.reduce((b, r) => (!b || r.accuracy < b.accuracy ? r : b), null);
  const village = best && nearestVillage(best.lat, best.lng);
  const verdict = best && serviceAreaVerdict(best.lat, best.lng, best.accuracy);

  return (
    <main className={s.page}>
      <h1 className={s.title}>Location check</h1>
      <p className={s.lead}>What this device reports, live. Nothing here is saved or sent anywhere.</p>

      <section className={s.panel}>
        <Row label="Secure page (https or localhost)" value={secure ? 'yes' : 'NO — location is blocked on this address'} bad={!secure} />
        <Row label="Location supported" value={supported ? 'yes' : 'no'} bad={!supported} />
        <Row label="Permission" value={permission} bad={permission === 'denied'} />
        <Row
          label="Device"
          value={device === 'computer' ? 'computer — most have no GPS; location is guessed from wifi or your internet provider' : device}
          bad={device === 'computer'}
        />
      </section>

      <div className={s.actions}>
        {!running ? (
          <button type="button" className={s.btn} onClick={start} disabled={!secure || !supported}>
            Start reading
          </button>
        ) : (
          <button type="button" className={s.btnAlt} onClick={stop}>
            Stop
          </button>
        )}
      </div>

      {error && <p className={s.error}>{error}</p>}

      {best && (
        <section className={s.panel}>
          <h2 className={s.h2}>Best reading so far</h2>
          <Row label="Coordinates" value={`${best.lat.toFixed(5)}, ${best.lng.toFixed(5)}`} />
          <Row label="Accuracy" value={fmtAcc(best.accuracy)} bad={best.accuracy > 2000} />
          <Row label="Nearest village" value={`${village.id} — ${fmtKm(village.km)} away`} />
          <Row label="From centre of delivery area" value={`${fmtKm(distanceKm(SERVICE_AREA.center, best))} (area radius ${SERVICE_AREA.radiusKm} km)`} />
          <Row label="App's verdict" value={verdict} bad={verdict !== 'in'} />
          <p className={s.map}>
            <a href={`https://www.google.com/maps?q=${best.lat},${best.lng}`} target="_blank" rel="noreferrer">
              Open this point on a map
            </a>{' '}
            — if the pin is not where you are standing, the device is wrong, not the app.
          </p>
        </section>
      )}

      {readings.length > 0 && (
        <section className={s.panel}>
          <h2 className={s.h2}>Every reading (newest first)</h2>
          <table className={s.table}>
            <thead>
              <tr><th>after</th><th>accuracy</th><th>coordinates</th><th>age</th></tr>
            </thead>
            <tbody>
              {readings.map((r, i) => (
                <tr key={`${r.at}-${i}`}>
                  <td>{(r.at / 1000).toFixed(1)} s</td>
                  <td>{fmtAcc(r.accuracy)}</td>
                  <td>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</td>
                  {/* A reading older than the request was cached, not measured. */}
                  <td>{r.age > 2000 ? `${Math.round(r.age / 1000)} s old (cached)` : 'fresh'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={s.note}>
            A real GPS fix usually starts at hundreds of metres and tightens to under 50 m within 10–30 seconds outdoors.
            If accuracy never gets below a few kilometres, the device is not using GPS.
          </p>
        </section>
      )}
    </main>
  );
}

function Row({ label, value, bad = false }) {
  return (
    <div className={s.row}>
      <span className={s.label}>{label}</span>
      <span className={bad ? s.bad : s.value}>{value}</span>
    </div>
  );
}
