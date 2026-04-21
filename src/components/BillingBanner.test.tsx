import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BillingBanner from "./BillingBanner";

const useBillingMock = vi.fn();

vi.mock("@/contexts/BillingContext", () => ({
  useBilling: () => useBillingMock(),
}));

describe("BillingBanner", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useBillingMock.mockReset();
  });

  it("renders nothing for complimentary accounts", () => {
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: true,
        subscription_status: "active",
        current_period_ends_at: null,
        trial_ends_at: null,
      },
      isBlocked: false,
    });

    const { container } = render(
      <MemoryRouter>
        <BillingBanner />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a blocking banner for blocked accounts", () => {
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        subscription_status: "expired",
        current_period_ends_at: null,
        trial_ends_at: null,
      },
      isBlocked: true,
    });

    render(
      <MemoryRouter>
        <BillingBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText(/subscription required/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open billing/i })).toHaveAttribute("href", "/settings");
  });

  it("shows trial ending soon messaging", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        subscription_status: "trialing",
        current_period_ends_at: null,
        trial_ends_at: "2026-04-23T12:00:00.000Z",
      },
      isBlocked: false,
    });

    render(
      <MemoryRouter>
        <BillingBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText(/trial ending soon/i)).toBeInTheDocument();
    expect(screen.getByText(/april 23, 2026/i)).toBeInTheDocument();
  });

  it("shows canceled access end date", () => {
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        subscription_status: "canceled",
        current_period_ends_at: "2026-05-01T00:00:00.000Z",
        trial_ends_at: null,
      },
      isBlocked: false,
    });

    render(
      <MemoryRouter>
        <BillingBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText(/subscription ends soon/i)).toBeInTheDocument();
    expect(screen.getByText(/your access stays active until/i)).toBeInTheDocument();
  });

  it("shows payment attention messaging for past due accounts", () => {
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        subscription_status: "past_due",
        current_period_ends_at: "2026-05-01T00:00:00.000Z",
        trial_ends_at: null,
      },
      isBlocked: false,
    });

    render(
      <MemoryRouter>
        <BillingBanner />
      </MemoryRouter>,
    );

    expect(screen.getByText(/payment needs attention/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage billing/i })).toHaveAttribute("href", "/settings");
  });
});
