import { describe, it, expect, vi } from "@jest/globals";
import { normalizeReasonCode, reasonSeverity } from "../moderationLogic.js";

describe("Moderation Logic - Unit Tests", () => {
  it("should normalize reason codes to fallback if unrecognized", () => {
    expect(normalizeReasonCode("harassment_hate")).toBe("harassment_hate");
    expect(normalizeReasonCode("some_random_reason")).toBe("other");
  });

  it("should correctly map severe reasons to high triage scores", () => {
    const sev = reasonSeverity("nudity_explicit");
    expect(sev.severity).toBe("high");
    expect(sev.points).toBe(2);
    expect(sev.triageScore).toBeGreaterThan(0.7);
  });

  it("should correctly map critical reasons like underage", () => {
    const sev = reasonSeverity("underage");
    expect(sev.severity).toBe("critical");
    expect(sev.points).toBe(3);
    expect(sev.triageScore).toBe(1.0);
  });
});
