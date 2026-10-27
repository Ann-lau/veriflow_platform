import { useEffect, useMemo, useState } from "react";
import { saveWorkOrderOffline } from "../db.js";
import { syncOutbox } from "../api.js";
import { useConnection } from "../connection.jsx";
import { readRegistryCache, ensureRegistry } from "../registryCache.js";
import TierNotice from "../TierNotice.jsx";
import "./Log.css";

const FAULTS = ["No water", "Broken part", "Leaking", "Other"];
const SHOWN = 6; // search results shown at a time

// Straight-line distance in km between two coordinates (haversine formula).
function km(aLat, aLon, bLat, bLon) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export default function Log() {
  const { tier, markSynced } = useConnection();
  const [registry, setRegistry] = useState(readRegistryCache);
  const [here, setHere] = useState(null);
  const [gpsNote, setGpsNote] = useState("Finding your location…");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const [fault, setFault] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  // Make sure the registry is on the phone, then use it. Works from the saved copy offline.
  useEffect(() => {
    ensureRegistry().then(() => setRegistry(readRegistryCache()));
  }, []);

  // Where the technician is, so the nearest water points come first.
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsNote("Location is not available on this device. Search by code.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHere({ lat: p.coords.latitude, lon: p.coords.longitude });
        setGpsNote(
          `Location captured, ${Math.round(p.coords.accuracy)} m accuracy`,
        );
      },
      () => setGpsNote("Location unavailable. Search by code."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const results = useMemo(() => {
    if (!registry) return [];
    const q = query.trim().toLowerCase();
    let list = registry.points.filter(
      (p) =>
        !q ||
        [p.wpdx_id, p.sub_county, p.tech].some((v) =>
          (v || "").toLowerCase().includes(q),
        ),
    );
    if (here) {
      list = list
        .map((p) => ({ ...p, d: km(here.lat, here.lon, p.lat, p.lon) }))
        .sort((a, b) => a.d - b.d);
    }
    return list.slice(0, SHOWN);
  }, [registry, query, here]);

  async function save(e) {
    e.preventDefault();
    if (!picked || !fault) {
      setError("Choose a water point and what is wrong.");
      return;
    }
    setError("");
    const description = note.trim() ? `${fault}: ${note.trim()}` : fault;
    const id = await saveWorkOrderOffline({
      waterpoint_id: picked.id,
      description,
    });
    setSaved({ id, code: picked.wpdx_id });
    setPicked(null);
    setFault("");
    setNote("");
    setQuery("");
    // Try to send right away; if the signal is weak or gone, it stays safely on the phone.
    try {
      const r = await syncOutbox(tier ?? 0);
      if (!r.skipped && !r.errors) markSynced();
    } catch {
      /* stays queued, the auto-sync will retry */
    }
  }

  const afterSave =
    tier === 4
      ? "Sending now."
      : tier === 1
        ? "It sends when the signal allows."
        : "It sends when a connection returns.";

  return (
    <div className="log">
      <h1>
        Report breakdown <span className="tag">Sample activity</span>
      </h1>
      <p className="sub">
        Find the water point, say what is wrong, and save. This works without a
        signal.
      </p>

      <TierNotice />

      <form className="logform" onSubmit={save}>
        <section>
          <label htmlFor="wp-search">Water point</label>
          {picked ? (
            <div className="picked">
              <div>
                <b className="mono">{picked.wpdx_id}</b>
                <small>
                  {picked.tech} · Kajiado {picked.sub_county}
                </small>
              </div>
              <button
                type="button"
                className="link"
                onClick={() => setPicked(null)}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                id="wp-search"
                placeholder="Type a code, sub-county or technology"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <p className="muted">
                {registry
                  ? `Searching ${registry.points.length} water points${here ? ", nearest first" : ""}.`
                  : "The water point list is not on this phone yet. Connect once to load it."}
              </p>
              <ul className="results">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setPicked(p)}>
                      <span>
                        <b className="mono">{p.wpdx_id}</b>
                        <small>
                          {p.tech} · Kajiado {p.sub_county}
                        </small>
                      </span>
                      {p.d != null && <small>{p.d.toFixed(1)} km</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section>
          <label>What is wrong?</label>
          <div className="faults">
            {FAULTS.map((f) => (
              <button
                type="button"
                key={f}
                className="fault"
                aria-pressed={fault === f}
                onClick={() => setFault(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <label htmlFor="wp-note">Details (optional)</label>
          <textarea
            id="wp-note"
            rows="3"
            placeholder="For example: the handle moves but no water comes out."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="loc">{gpsNote}</div>
          {error && <p className="err">{error}</p>}
          <button className="cta" type="submit">
            Save on phone
          </button>

          {saved && (
            <div className="saved" role="status">
              <b>Saved as {saved.id.slice(0, 8)}</b>
              {saved.code}. {afterSave}
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
