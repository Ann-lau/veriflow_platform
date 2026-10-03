import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, syncOutbox, refreshWaterPoints } from "../db.js";
import { refreshWaterPoints as refreshWPs } from "../api.js";

export default function Home({ onNavigate }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const workOrders = useLiveQuery(() => db.workOrders.toArray(), []);
  const pending = useLiveQuery(
    () => db.outbox.where("synced").equals(0).count(),
    [],
  );
  const waterPoints = useLiveQuery(() => db.waterPoints.toArray(), []);

  async function doSync() {
    try {
      const r = await syncOutbox();
      setMessage(JSON.stringify(r));
      await refreshWPs();
    } catch (e) {
      setMessage(`Sync error: ${e.message}`);
    }
  }

  return (
    <div>
      <div className="banner">
        {online ? "🟢 Online" : "🔴 OFFLINE – changes saved on device"}
      </div>

      <button className="primary" onClick={() => onNavigate("log")}>
        + Log Breakdown
      </button>
      <button onClick={doSync} disabled={!online}>
        Sync now {pending ? `(${pending} pending)` : ""}
      </button>
      {message && <p className="note">{message}</p>}

      <h3>My Work Orders ({workOrders?.length ?? 0})</h3>
      {workOrders?.map((o) => (
        <div className="card" key={o.id}>
          <b>{o.id.slice(0, 8)}</b> – {o.description}
          <span className={o.synced ? "badge ok" : "badge queued"}>
            {o.synced ? "synced" : "queued"}
          </span>
        </div>
      ))}

      <h3>Water Points ({waterPoints?.length ?? 0})</h3>
      {waterPoints?.map((wp) => (
        <div className="card" key={wp.id}>
          <b>{wp.id.slice(0, 8)}</b> – {wp.type} – {wp.status}
        </div>
      ))}
    </div>
  );
}
