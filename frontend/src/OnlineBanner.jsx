import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db.js";

export default function OnlineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const queued = useLiveQuery(() => db.outbox.count(), []);

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

  if (online) return null;

  return (
    <div className="banner">
      {queued > 0
        ? `Offline: ${queued} change${queued === 1 ? "" : "s"} waiting to sync`
        : "Offline: showing saved data"}
    </div>
  );
}
