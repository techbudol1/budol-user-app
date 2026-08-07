import { apiBaseURL } from "./runtimeConfig";

export type PilotEvent = "pilot_started" | "wallet_connected" | "public_trade_completed" | "private_trade_completed" | "position_sold" | "public_claim_completed" | "private_claim_completed" | "feedback_submitted";
export type PilotFeedbackInput = { area: string; category: string; message: string; rating: number };

const PILOT_ID_KEY = "budolph-pilot-id-v1";

function pilotId() {
  const existing = localStorage.getItem(PILOT_ID_KEY);
  if (existing) return existing;
  const created = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("")}`;
  localStorage.setItem(PILOT_ID_KEY, created);
  return created;
}

function deviceClass() {
  if (window.innerWidth < 640) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

async function post(path: string, body: object) {
  const response = await fetch(`${apiBaseURL()}${path}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to submit pilot feedback.");
  }
  return response;
}

export function recordPilotEvent(event: PilotEvent) {
  return post("/api/pilot/events", { anonymousId: pilotId(), deviceClass: deviceClass(), event }).catch(() => undefined);
}

export async function submitPilotFeedback(input: PilotFeedbackInput) {
  await post("/api/pilot/feedback", { ...input, anonymousId: pilotId(), deviceClass: deviceClass() });
}
