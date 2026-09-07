export type GmailEventType = "INBOUND_REPLY" | "BOUNCE" | "AUTOMATIC_RESPONSE" | "OPT_OUT" | "UNKNOWN_INBOUND";

export function gmailEventTransition(eventType: GmailEventType) {
  if (eventType === "INBOUND_REPLY") return { terminal: true, state: "REPLIED" as const, suppress: false };
  if (eventType === "BOUNCE") return { terminal: true, state: "BOUNCED" as const, suppress: true };
  if (eventType === "OPT_OUT") return { terminal: true, state: "OPTED_OUT" as const, suppress: true };
  return { terminal: false, state: null, suppress: false };
}
