import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db.js";
import { useConnection } from "./connection.jsx";

// Says so when the connection is weak or gone, and how much is waiting to be sent.
export default function OnlineBanner() {
  const { tier } = useConnection();
  // Only operations not yet synced are waiting. The old count also included synced ones.
  const queued = useLiveQuery(
    () => db.outbox.where("synced").equals(0).count(),
    [],
  );

  if (tier === null || tier === 4) return null;

  const waiting =
    queued > 0
      ? `${queued} change${queued === 1 ? "" : "s"} waiting to sync`
      : null;
  const text =
    tier === 0
      ? waiting
        ? `Offline: ${waiting}`
        : "Offline: showing saved data"
      : waiting
        ? `Weak signal: ${waiting}. Photos wait for a better connection.`
        : "Weak signal: showing saved data";

  return <div className="banner warn">{text}</div>;
}
