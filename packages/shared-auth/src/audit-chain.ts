import crypto from "crypto";

export interface AuditEventRecord {
  id: string;
  event_type: string;
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  prev_hash: string;
  event_hash: string;
}

export function computeAuditEventHash(input: {
  id: string;
  event_type: string;
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  prev_hash: string;
}): string {
  const canonical = JSON.stringify({
    id: input.id,
    event_type: input.event_type,
    actor_id: input.actor_id,
    payload: input.payload,
    created_at: input.created_at,
    prev_hash: input.prev_hash,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function appendAuditEvent(
  events: AuditEventRecord[],
  next: Omit<AuditEventRecord, "prev_hash" | "event_hash">,
): AuditEventRecord {
  const prevHash = events.length
    ? events[events.length - 1]?.event_hash || "GENESIS"
    : "GENESIS";
  const eventHash = computeAuditEventHash({
    ...next,
    prev_hash: prevHash,
  });

  const record: AuditEventRecord = {
    ...next,
    prev_hash: prevHash,
    event_hash: eventHash,
  };
  events.push(record);
  return record;
}

export function verifyAuditChain(events: AuditEventRecord[]): {
  valid: boolean;
  reason?: string;
  failed_index?: number;
} {
  let expectedPrev = "GENESIS";
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.prev_hash !== expectedPrev) {
      return {
        valid: false,
        reason: "previous hash mismatch",
        failed_index: index,
      };
    }
    const recomputed = computeAuditEventHash({
      id: event.id,
      event_type: event.event_type,
      actor_id: event.actor_id,
      payload: event.payload,
      created_at: event.created_at,
      prev_hash: event.prev_hash,
    });
    if (event.event_hash !== recomputed) {
      return {
        valid: false,
        reason: "event hash mismatch",
        failed_index: index,
      };
    }
    expectedPrev = event.event_hash;
  }
  return { valid: true };
}
