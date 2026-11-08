/** Product rules, shared by server and client. */
export const PLANS = {
  free: { label: "Free", sessionMinutes: 70, maxActiveSessions: 1, recording: false },
  premium: { label: "Premium", sessionMinutes: 360, maxActiveSessions: 1, recording: true, priceUsd: 3 },
} as const;

/** Every meeting link stops working this long after it is created. */
export const LINK_LIFETIME_HOURS = 6;

export type PlanId = keyof typeof PLANS;
