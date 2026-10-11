import { useLiveQuery } from "dexie-react-hooks";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

  // Center the map on the average position of the water points,
  // falling back to central Kenya if the list is empty.
  const center =
    total > 0
      ? [
          (waterPoints ?? []).reduce((sum, wp) => sum + Number(wp.gps_lat), 0) /
            total,
          (waterPoints ?? []).reduce((sum, wp) => sum + Number(wp.gps_lon), 0) /
            total,
        ]
      : [-1.29, 36.82];

  function pinColor(status) {
    if (status === "functional") return "#2f6b44"; // green
    if (status === "broken") return "#b0452f"; // red
    return "#8a93a0"; // gray = unknown
  }

  return (
    <div>
      <h2>Dashboard</h2>

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

      <h3>Water Point Map</h3>
      <div className="map-wrap">
        <MapContainer center={center} zoom={9}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {(waterPoints ?? []).map((wp) => (
            <CircleMarker
              key={wp.id}
              center={[Number(wp.gps_lat), Number(wp.gps_lon)]}
              radius={10}
              pathOptions={{ color: pinColor(wp.status), fillOpacity: 0.9 }}
            >
              <Popup>
                <b>{wp.type}</b>
                <br />
                Status: {wp.status}
                <br />
                ID: {wp.id.slice(0, 8)}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
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
                <span className="badge queued">{wp.status}</span>
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
