import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BillingGate from "./BillingGate";

const useBillingMock = vi.fn();
const invokeMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/contexts/BillingContext", () => ({
  useBilling: () => useBillingMock(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("BillingGate", () => {
  beforeEach(() => {
    useBillingMock.mockReset();
    invokeMock.mockReset();
    toastErrorMock.mockReset();
    useBillingMock.mockReturnValue({
      profile: null,
      refreshProfile: vi.fn(),
    });
  });

  it("invokes checkout from the paywall", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "Checkout unavailable" } });

    render(
      <MemoryRouter>
        <BillingGate />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /start subscription/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("create-checkout-session", { body: {} });
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Checkout unavailable");
  });

  it("shows the manage billing button when a Stripe customer exists", () => {
    useBillingMock.mockReturnValue({
      profile: { stripe_customer_id: "cus_123" },
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <BillingGate />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /manage billing/i })).toBeInTheDocument();
  });

  it("refreshes billing status on demand", () => {
    const refreshProfile = vi.fn();
    useBillingMock.mockReturnValue({
      profile: null,
      refreshProfile,
    });

    render(
      <MemoryRouter>
        <BillingGate />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /refresh status/i }));

    expect(refreshProfile).toHaveBeenCalled();
  });
});
