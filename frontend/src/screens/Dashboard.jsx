import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db.js";

export default function Dashboard() {
  const waterPoints = useLiveQuery(() => db.waterPoints.toArray(), []);
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), []);

  const total = waterPoints?.length ?? 0;
  const functional = (waterPoints ?? []).filter(
    (wp) => wp.status === "functional",
  ).length;
  const broken = (waterPoints ?? []).filter(
    (wp) => wp.status === "broken",
  ).length;

  return (
    <div>
      <h2>District Dashboard</h2>

      <div className="kpirow">
        <div className="kpi">
          <div className="kpi-num">{total}</div>
          <div className="kpi-label">Water Points</div>
        </div>
        <div className="kpi">
          <div className="kpi-num ok">{functional}</div>
          <div className="kpi-label">Functional</div>
        </div>
        <div className="kpi">
          <div className="kpi-num bad">{broken}</div>
          <div className="kpi-label">Broken</div>
        </div>
        <div className="kpi">
          <div className="kpi-num">{workOrders?.length ?? 0}</div>
          <div className="kpi-label">Work Orders</div>
        </div>
      </div>

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
                <span
                  className={
                    wp.status === "functional" ? "badge ok" : "badge queued"
                  }
                >
                  {wp.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Work Orders</h3>
      <table>
        <thead>
          <tr>
            <th>Work Order</th>
            <th>Description</th>
            <th>State</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
