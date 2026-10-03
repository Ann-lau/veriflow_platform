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
