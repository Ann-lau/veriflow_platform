import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db.js";
import { syncOutbox, refreshWaterPoints } from "../api.js";

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
      await refreshWaterPoints();
    } catch (e) {
      setMessage(`Sync error: ${e.message}`);
    }
  }

  return (
    <div>
      <h2>Home</h2>
      <div className="banner">
        {online ? "🟢 Online" : "🔴 OFFLINE – changes saved on device"}
      </div>
      <button className="primary" onClick={() => onNavigate("log")}>
        + Log Breakdown
      </button>{" "}
      <button onClick={doSync} disabled={!online}>
        Sync now {pending ? `(${pending} pending)` : ""}
      </button>
      {message && <p className="note">{message}</p>}
      <h3>Work Orders</h3>
      <table>
        <thead>
          <tr>
            <th>Work Order</th>
            <th>Description</th>
            <th>State</th>
            <th>Sync</th>
          </tr>
        </thead>
        <tbody>
          {workOrders?.map((o) => (
            <tr key={o.id}>
              <td>{o.id.slice(0, 8)}</td>
              <td>{o.description}</td>
              <td>
                <span className="badge queued">{o.state}</span>
              </td>
              <td>
                <span className={o.synced ? "badge ok" : "badge queued"}>
                  {o.synced ? "synced" : "queued"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Water Points</h3>
      <table>
        <thead>
          <tr>
            <th>Water Point</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {waterPoints?.map((wp) => (
            <tr key={wp.id}>
              <td>{wp.id.slice(0, 8)}</td>
              <td>{wp.type}</td>
              <td>
                <span className="badge queued">{wp.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
