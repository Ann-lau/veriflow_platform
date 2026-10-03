import { db } from "./db.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function fetchWaterPoints() {
  const res = await fetch(`${API_BASE}/waterpoints`);
  if (!res.ok) throw new Error("Failed to fetch water points");
  return res.json();
}

// Cache water points locally so the Log form works offline too.
export async function refreshWaterPoints() {
  const wps = await fetchWaterPoints();
  await db.waterPoints.clear();
  await db.waterPoints.bulkPut(wps);
  return wps.length;
}

// Increment 1 core: send the whole outbox. The server deduplicates by
// op_id, so retries and replays are always safe (FR11, NFR2).
export async function syncOutbox() {
  if (!navigator.onLine) return { skipped: true, reason: "offline" };
  const ops = await db.outbox.where("synced").equals(0).toArray();
  if (ops.length === 0) return { applied: 0, note: "nothing to sync" };

  const res = await fetch(`${API_BASE}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      ops.map((o) => ({
        op_id: o.op_id,
        entity: o.entity,
        action: o.action,
        payload: o.payload,
      })),
    ),
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

  const results = await res.json();
  for (const r of results) {
    if (r.status === "applied" || r.status === "duplicate") {
      await db.outbox.where("op_id").equals(r.op_id).modify({ synced: 1 });
    }
    // "error" stays queued for the next attempt – nothing is lost
  }
  return {
    applied: results.filter((r) => r.status === "applied").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    errors: results.filter((r) => r.status === "error").length,
  };
}
