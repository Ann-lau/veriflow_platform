import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveEvidenceOffline, newId } from "../db.js";

export default function Evidence() {
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), []);
  const [form, setForm] = useState({
    workorder_id: "",
    parts_replaced: "",
    flow_verified: false,
  });
  const [photo, setPhoto] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("Locating...");
  const [savedId, setSavedId] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("GPS not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsStatus(
          `GPS locked – ${Math.round(pos.coords.accuracy)} m accuracy`,
        );
      },
      () => setGpsStatus("GPS unavailable – evidence will be flagged"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.workorder_id) {
      alert("Select the work order first");
      return;
    }
    const id = await saveEvidenceOffline({
      id: newId(),
      workorder_id: form.workorder_id,
      photoBlob: photo,
      parts_replaced: form.parts_replaced,
      flow_verified: form.flow_verified,
      gps_captured_lat: gps ? gps.lat : null,
      gps_captured_lon: gps ? gps.lon : null,
      captured_at: new Date().toISOString(),
    });
    setSavedId(id);
    setForm({ workorder_id: "", parts_replaced: "", flow_verified: false });
    setPhoto(null);
  }

  return (
    <div>
      <h2>Capture Repair Evidence</h2>
      <p className="note">{gpsStatus}</p>

      <form onSubmit={handleSubmit}>
        <label>Work order</label>
        <select
          value={form.workorder_id}
          onChange={(e) => setForm({ ...form, workorder_id: e.target.value })}
        >
          <option value="">Select work order...</option>
          {workOrders?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id.slice(0, 8)} – {o.description} ({o.state})
            </option>
          ))}
        </select>

        <label>Repair photo</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files[0] || null)}
        />
        {photo && <p className="note">Photo attached: {photo.name}</p>}

        <label>Parts replaced</label>
        <input
          type="text"
          placeholder="e.g. pump seal, valve"
          value={form.parts_replaced}
          onChange={(e) => setForm({ ...form, parts_replaced: e.target.value })}
        />

        <label className="check">
          <input
            type="checkbox"
            checked={form.flow_verified}
            onChange={(e) =>
              setForm({ ...form, flow_verified: e.target.checked })
            }
          />{" "}
          Water flow verified after repair
        </label>

        <button className="primary" type="submit">
          Submit Evidence
        </button>
      </form>

      {savedId && (
        <p className="note">
          ✔ Evidence saved offline as {savedId.slice(0, 8)} – will sync when
          connected.
        </p>
      )}
    </div>
  );
}
