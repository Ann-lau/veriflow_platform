import Dexie from "dexie";

// Local store: everything the technician does is saved here FIRST,
// and queued for sync. The server is never a prerequisite (NFR1).
export const db = new Dexie("veriflow");

db.version(1).stores({
  waterPoints: "id, name",
  workOrders: "id, waterpoint_id, state",
  evidence: "id, workorder_id",
  outbox: "++seq, op_id, synced",
});

export const newId = () => crypto.randomUUID();

// Every write adds one queued operation carrying its own op_id
// (the idempotency key the server deduplicates on).
export async function queueOperation(entity, action, payload) {
  const op_id = newId();
  await db.outbox.add({ op_id, entity, action, payload, synced: 0 });
  return op_id;
}

// Save work order locally + queue it, in ONE transaction (all or nothing).
export async function saveWorkOrderOffline(data) {
  const id = data.id || newId();
  await db.transaction("rw", db.workOrders, db.outbox, async () => {
    await db.workOrders.put({
      id,
      created_at: Date.now(),
      waterpoint_id: data.waterpoint_id,
      technician_id: data.technician_id,
      description: data.description,
      state: "logged",
      synced: 0,
    });
    await queueOperation("workorder", "create", {
      id,
      waterpoint_id: data.waterpoint_id,
      technician_id: data.technician_id,
      description: data.description,
    });
  });
  return id;
}

// Save evidence locally: photo stored as a Blob in IndexedDB,
// plus a queued operation. The GPS and time are captured by the
// device at the moment of submission (FR2).
export async function saveEvidenceOffline(data) {
  const id = data.id || newId();
  await db.transaction("rw", db.evidence, db.outbox, async () => {
    await db.evidence.put({
      id,
      workorder_id: data.workorder_id,
      photoBlob: data.photoBlob || null,   // stored as Blob, not a file path
      parts_replaced: data.parts_replaced,
      flow_verified: data.flow_verified,
      gps_captured_lat: data.gps_captured_lat,
      gps_captured_lon: data.gps_captured_lon,
      captured_at: data.captured_at,
      validation_result: "pending",
      synced: 0,
    });
    await queueOperation("evidence", "create", {
      id,
      workorder_id: data.workorder_id,
      parts_replaced: data.parts_replaced,
      flow_verified: data.flow_verified,
      gps_captured_lat: data.gps_captured_lat,
      gps_captured_lon: data.gps_captured_lon,
      captured_at: data.captured_at,
      photo_ref: data.photoBlob ? "stored-on-device" : null,
    });
  });
  return id;
}
