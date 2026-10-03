import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, saveWorkOrderOffline } from "../db.js";

export default function Log({ onNavigate }) {
  const waterPoints = useLiveQuery(() => db.waterPoints.toArray(), []);
  const [form, setForm] = useState({
    waterpoint_id: "",
    description: "",
  });
  const [savedId, setSavedId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.waterpoint_id) {
      alert("Select a water point first");
      return;
    }
    const id = await saveWorkOrderOffline(form);
    setSavedId(id);
    setForm({ waterpoint_id: "", description: "" });
  }

  return (
    <div>
      <h2>Log Breakdown</h2>
      <form onSubmit={handleSubmit}>
        <label>Water Point</label>
        <select
          value={form.waterpoint_id}
          onChange={(e) => setForm({ ...form, waterpoint_id: e.target.value })}
        >
          <option value="">Select water point...</option>
          {waterPoints?.map((wp) => (
            <option key={wp.id} value={wp.id}>
              {wp.type} – {wp.id.slice(0, 8)} ({wp.status})
            </option>
          ))}
        </select>

        <label>Description</label>
        <textarea
          rows="4"
          placeholder="Describe the fault..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <button className="primary" type="submit">
          Save to Device
        </button>
      </form>

      {savedId && (
        <p className="note">
          ✔ Saved offline as {savedId.slice(0, 8)} – will sync when connected.
        </p>
      )}
    </div>
  );
}
