import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";

const useAuthMock = vi.fn();
const useBillingMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();
const rpcMock = vi.fn();
const navigateMock = vi.fn();
const signOutMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/contexts/BillingContext", () => ({
  useBilling: () => useBillingMock(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: (...args: unknown[]) => selectMock(...args),
    }),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("./BillingBanner", () => ({
  default: () => <div data-testid="billing-banner" />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("AppLayout", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useBillingMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    singleMock.mockReset();
    rpcMock.mockReset();
    navigateMock.mockReset();
    signOutMock.mockReset();
    toastErrorMock.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    window.confirm = vi.fn(() => true);

    useAuthMock.mockReturnValue({
      user: { id: "user-1", email: "owner@example.com" },
      signOut: signOutMock,
    });
    useBillingMock.mockReturnValue({
      isBlocked: false,
    });

    singleMock.mockResolvedValue({
      data: {
        daycare_name: "Little Stars",
        provider_name: "Owner",
      },
    });
    eqMock.mockReturnValue({ single: singleMock });
    selectMock.mockReturnValue({ eq: eqMock });
  });

  it("routes blocked accounts to settings instead of creating a kiosk session", async () => {
    useBillingMock.mockReturnValue({
      isBlocked: true,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout>
          <div>Dashboard</div>
        </AppLayout>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /kiosk/i }));

    expect(navigateMock).toHaveBeenCalledWith("/settings");
    expect(rpcMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("creates a kiosk session and signs out before navigating to kiosk", async () => {
    rpcMock.mockResolvedValue({
      data: [{ token: "session-123", daycare_name: "Little Stars" }],
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout>
          <div>Dashboard</div>
        </AppLayout>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /kiosk/i }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("create_kiosk_session", {
        daycare_name_override: "Little Stars",
      });
    });
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith("/kiosk");
    });
    expect(sessionStorage.getItem("kiosk_session_token")).toBe("session-123");
    expect(sessionStorage.getItem("kiosk_daycare_name")).toBe("Little Stars");
  });

  it("shows the RPC error when kiosk session creation fails", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Billing inactive" },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout>
          <div>Dashboard</div>
        </AppLayout>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /kiosk/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Billing inactive");
    });
    expect(signOutMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith("/kiosk");
  });
});
