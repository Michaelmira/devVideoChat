import { describe, expect, it } from "vitest";
import { endsAt } from "@/lib/sessions";

const base = new Date("2026-01-01T12:00:00Z");
const hours = (h: number) => new Date(base.getTime() + h * 3600_000);

describe("meeting end time", () => {
  it("uses link expiry before the host joins", () => {
    expect(endsAt({ expiresAt: hours(6), startedAt: null, maxDurationMinutes: 70 })).toEqual(hours(6));
  });

  it("uses start + plan length once started", () => {
    const end = endsAt({ expiresAt: hours(6), startedAt: hours(1), maxDurationMinutes: 70 });
    expect(end).toEqual(new Date(hours(1).getTime() + 70 * 60_000));
  });

  it("never runs past link expiry", () => {
    expect(endsAt({ expiresAt: hours(6), startedAt: hours(5), maxDurationMinutes: 360 })).toEqual(hours(6));
  });
});
