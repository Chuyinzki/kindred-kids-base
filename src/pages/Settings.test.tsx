import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./Settings";

const useAuthMock = vi.fn();
const useBillingMock = vi.fn();
const setThemeMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();
const updateEqMock = vi.fn();
const updateMock = vi.fn();
const invokeMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const toastMessageMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/contexts/BillingContext", () => ({
  useBilling: () => useBillingMock(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "light",
    setTheme: setThemeMock,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => selectMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    }),
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    message: (...args: unknown[]) => toastMessageMock(...args),
  },
}));

describe("Settings page", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useBillingMock.mockReset();
    setThemeMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    singleMock.mockReset();
    updateEqMock.mockReset();
    updateMock.mockReset();
    invokeMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    toastMessageMock.mockReset();

    useAuthMock.mockReturnValue({
      user: { id: "user-1", email: "owner@example.com" },
    });
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        complimentary_note: null,
        subscription_status: "trialing",
        trial_ends_at: "2026-04-30T00:00:00.000Z",
        current_period_ends_at: null,
        stripe_customer_id: null,
      },
      refreshProfile: vi.fn(),
    });

    singleMock.mockResolvedValue({
      data: {
        provider_number: "12345",
        provider_name: "Owner",
        provider_alt_id: "ALT",
        daycare_name: "Little Stars",
      },
    });
    eqMock.mockReturnValue({ single: singleMock });
    selectMock.mockReturnValue({ eq: eqMock });

    updateEqMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: updateEqMock });
  });

  it("renders paid billing state and starts checkout", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "Checkout unavailable" } });

    render(<SettingsPage />);

    expect(await screen.findByRole("heading", { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByText(/\$24\/month with a 14-day free trial/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start subscription/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start subscription/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("create-checkout-session", { body: {} });
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Checkout unavailable");
  });

  it("renders complimentary billing state without purchase actions", async () => {
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: true,
        complimentary_note: "Free forever",
        subscription_status: "active",
        trial_ends_at: null,
        current_period_ends_at: null,
        stripe_customer_id: null,
      },
      refreshProfile: vi.fn(),
    });

    render(<SettingsPage />);

    expect(await screen.findByText(/lifetime complimentary access/i)).toBeInTheDocument();
    expect(screen.getByText(/free forever/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start subscription/i })).not.toBeInTheDocument();
    expect(screen.getByText(/marked complimentary/i)).toBeInTheDocument();
  });

  it("opens the customer portal for existing paid accounts", async () => {
    invokeMock.mockResolvedValue({ data: { url: undefined }, error: { message: "Portal unavailable" } });
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        complimentary_note: null,
        subscription_status: "active",
        trial_ends_at: null,
        current_period_ends_at: "2026-05-30T00:00:00.000Z",
        stripe_customer_id: "cus_123",
      },
      refreshProfile: vi.fn(),
    });

    render(<SettingsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /manage billing/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("create-customer-portal", { body: {} });
    });
    expect(toastErrorMock).toHaveBeenCalledWith("Portal unavailable");
  });

  it("saves provider details and refreshes billing profile", async () => {
    const refreshProfile = vi.fn();
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        complimentary_note: null,
        subscription_status: "trialing",
        trial_ends_at: "2026-04-30T00:00:00.000Z",
        current_period_ends_at: null,
        stripe_customer_id: null,
      },
      refreshProfile,
    });

    render(<SettingsPage />);

    const daycareNameInput = await screen.findByDisplayValue("Little Stars");
    fireEvent.change(daycareNameInput, { target: { value: "New Name Daycare" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        provider_number: "12345",
        provider_name: "Owner",
        provider_alt_id: "ALT",
        daycare_name: "New Name Daycare",
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Settings saved");
    expect(refreshProfile).toHaveBeenCalled();
  });

  it("refreshes billing after a successful checkout return", async () => {
    const refreshProfile = vi.fn();
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    window.history.pushState({}, "", "/settings?checkout=success");
    useBillingMock.mockReturnValue({
      profile: {
        is_complimentary: false,
        complimentary_note: null,
        subscription_status: "trialing",
        trial_ends_at: "2026-04-30T00:00:00.000Z",
        current_period_ends_at: null,
        stripe_customer_id: null,
      },
      refreshProfile,
    });

    render(<SettingsPage />);

    await screen.findByRole("heading", { name: /^settings$/i });

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Billing updated. Refreshing your account status...");
    });
    expect(refreshProfile).toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledWith({}, "", "/settings");

    replaceStateSpy.mockRestore();
    window.history.pushState({}, "", "/");
  });
});
