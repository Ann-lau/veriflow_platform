import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db.js";
import { syncOutbox, refreshWaterPoints } from "../api.js";
import { useConnection } from "../connection.jsx";
import TierNotice from "../TierNotice.jsx";
import "./Home.css";

const STEPS = ["Logged", "Dispatched", "Evidence sent", "Verified"];
const STEP_OF_STATE = {
  logged: 0,
  dispatched: 1,
  parts_replaced: 2,
  flow_verified: 3,
};

// How far one job got, and where it is right now, from what is stored on this phone.
function describe(order, evidence) {
  let step = STEP_OF_STATE[order.state] ?? 0;
  if (evidence) step = Math.max(step, 2);
  if (!order.synced) return { step, pill: "Saved on phone", tone: "flag" };
  if (evidence && !evidence.synced)
    return { step, pill: "Photo waiting", tone: "flag" };
  if (order.state === "flow_verified")
    return { step, pill: "Verified", tone: "ok" };
  if (evidence) return { step, pill: "Sent, awaiting check", tone: "" };
  return { step, pill: "Sent", tone: "" };
}

function Progress({ step }) {
  return (
    <div
      className="prog"
      role="img"
      aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
    >
      {STEPS.map((name, i) => (
        <span key={name} className="seg">
          {i > 0 && <u className={i <= step ? "d" : ""} />}
          <i className={i < step ? "d" : i === step ? "c" : ""} />
        </span>
      ))}
    </div>
  );
}

export default function Home({ onNavigate }) {
  const { tier, check } = useConnection();
  const [message, setMessage] = useState("");

  const workOrders = useLiveQuery(() => db.workOrders.toArray(), []);
  const evidence = useLiveQuery(() => db.evidence.toArray(), []);
  const points = useLiveQuery(() => db.waterPoints.toArray(), []);
  const pending = useLiveQuery(
    () => db.outbox.where("synced").equals(0).count(),
    [],
  );

  const evidenceByOrder = new Map(
    (evidence ?? []).map((e) => [e.workorder_id, e]),
  );
  const pointById = new Map((points ?? []).map((p) => [p.id, p]));
  const orders = [...(workOrders ?? [])].sort(
    (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0),
  );
  const label = (o) =>
    pointById.get(o.waterpoint_id)?.name ??
    `Water point ${o.waterpoint_id.slice(0, 8)}`;

  async function doSync() {
    setMessage("");
    try {
      check();
      const r = await syncOutbox(tier ?? 0);
      if (r.skipped)
        setMessage("No connection. Your changes are saved on this phone.");
      else if (r.applied) setMessage(`${r.applied} sent.`);
      else setMessage("Nothing new to send.");
      if (tier === 4) await refreshWaterPoints();
    } catch (e) {
      setMessage(`Could not sync: ${e.message}`);
    }
  }

  return (
    <div className="tech">
      <h1>
        Technician app <span className="tag">Sample activity</span>
      </h1>
      <p className="sub">
        Your jobs, and what the connection can do right now.
      </p>

      <div className="topline">
        <TierNotice />
        <button className="cta" onClick={() => onNavigate("log")}>
          Report breakdown
        </button>
      </div>

      <div className="qhead">
        <h2>My queue ({orders.length})</h2>
        <button
          className="link"
          onClick={doSync}
          disabled={tier === null || tier === 0}
        >
          Sync now{pending ? ` (${pending} waiting)` : ""}
        </button>
      </div>
      {message && <p className="muted">{message}</p>}
      {orders.length === 0 && (
        <p className="muted">No jobs yet. Report a breakdown to start one.</p>
      )}

      <div className="queue">
        {orders.map((o) => {
          const d = describe(o, evidenceByOrder.get(o.id));
          return (
            <article className="wo" key={o.id}>
              <b>{o.description || "Breakdown"}</b>
              <small>{label(o)}</small>
              <Progress step={d.step} />
              <span className={`pill ${d.tone}`}>{d.pill}</span>
            </article>
          );
        })}
      </div>
    </div>
  );
}
