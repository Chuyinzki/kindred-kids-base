import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatSubscriptionLabel,
  formatSubscriptionTone,
  hasBillingAccess,
  isBillingBlocked,
  isTrialEndingSoon,
} from "./billing";

describe("billing helpers", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("grants access to complimentary accounts regardless of subscription status", () => {
    expect(hasBillingAccess({
      subscription_status: "expired",
      current_period_ends_at: null,
      is_complimentary: true,
    })).toBe(true);
  });

  it("grants access to canceled accounts before period end", () => {
    expect(hasBillingAccess({
      subscription_status: "canceled",
      current_period_ends_at: "2099-01-01T00:00:00.000Z",
      is_complimentary: false,
    })).toBe(true);
  });

  it("blocks canceled accounts after period end", () => {
    expect(hasBillingAccess({
      subscription_status: "canceled",
      current_period_ends_at: "2020-01-01T00:00:00.000Z",
      is_complimentary: false,
    })).toBe(false);
    expect(isBillingBlocked({
      subscription_status: "canceled",
      current_period_ends_at: "2020-01-01T00:00:00.000Z",
      is_complimentary: false,
    })).toBe(true);
  });

  it("marks trials ending within three days as ending soon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    expect(isTrialEndingSoon("2026-04-23T12:00:00.000Z")).toBe(true);
    expect(isTrialEndingSoon("2026-04-30T12:00:00.000Z")).toBe(false);
    expect(isTrialEndingSoon(null)).toBe(false);
  });

  it("formats complimentary labels and tones distinctly", () => {
    expect(formatSubscriptionLabel("active", true)).toBe("Complimentary");
    expect(formatSubscriptionTone("expired", true)).toBe("secondary");
  });

  it("formats standard labels and tones for paid statuses", () => {
    expect(formatSubscriptionLabel("trialing")).toBe("Free trial");
    expect(formatSubscriptionLabel("past_due")).toBe("Past due");
    expect(formatSubscriptionTone("active")).toBe("default");
    expect(formatSubscriptionTone("past_due")).toBe("outline");
    expect(formatSubscriptionTone("expired")).toBe("destructive");
  });
});
