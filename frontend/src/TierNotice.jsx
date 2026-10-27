import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db.js";
import { useConnection } from "./connection.jsx";
import "./TierNotice.css";

// What the connection can do right now, in plain words, with how much is waiting.
// Used at the top of the technician screens.
const COPY = {
  4: {
    title: "Good signal",
    text: "Everything sends right away.",
    filled: 4,
    tone: "t4",
  },
  1: {
    title: "Weak signal: text sends first",
    text: "Photos wait for a stronger signal.",
    filled: 2,
    tone: "t1",
  },
  0: {
    title: "Offline",
    text: "Saved on this phone. Nothing is lost.",
    filled: 0,
    tone: "t0",
  },
};

export default function TierNotice() {
  const { tier } = useConnection();
  const waiting =
    useLiveQuery(() => db.outbox.where("synced").equals(0).count(), []) ?? 0;
  const c =
    tier === null
      ? { title: "Checking connection", text: "", filled: 0, tone: "t0" }
      : COPY[tier];
  const extra =
    tier !== 4 && waiting > 0
      ? ` ${waiting} item${waiting === 1 ? "" : "s"} waiting.`
      : "";

  return (
    <div className={`tiernote ${c.tone}`} role="status">
      <b>{c.title}</b>
      <span>
        {c.text}
        {extra}
      </span>
      <div className="bar4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < c.filled ? "f" : ""} />
        ))}
      </div>
    </div>
  );
}
