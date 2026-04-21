import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Kiosk from "./Kiosk";

const rpcMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("Kiosk page", () => {
  beforeEach(() => {
    vi.useRealTimers();
    rpcMock.mockReset();
    toastErrorMock.mockReset();
    sessionStorage.clear();
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  it("shows expired state when no kiosk token exists", () => {
    render(<Kiosk />);

    expect(screen.getByText(/kiosk session unavailable/i)).toBeInTheDocument();
  });

  it("shows incorrect pin without moving to the action step", async () => {
    sessionStorage.setItem("kiosk_session_token", "token-1");
    sessionStorage.setItem("kiosk_daycare_name", "Little Stars");
    rpcMock
      .mockResolvedValueOnce({
        data: [{ id: "child-1", name: "Ava", parent_name: "Parent" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ pin_valid: false, id: null, check_in_am: null, check_out_am: null, check_in_pm: null, check_out_pm: null, marked_absent: false }],
        error: null,
      });

    render(<Kiosk />);

    fireEvent.click(await screen.findByRole("button", { name: /ava/i }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("kiosk_get_child_state", {
        session_token: "token-1",
        child_uuid: "child-1",
        entered_pin: "1234",
      });
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Incorrect PIN");
    expect(screen.queryByText(/hi, parent of ava/i)).not.toBeInTheDocument();
  });

  it("transitions to action state on a valid pin", async () => {
    sessionStorage.setItem("kiosk_session_token", "token-1");
    rpcMock
      .mockResolvedValueOnce({
        data: [{ id: "child-1", name: "Ava", parent_name: "Parent" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ pin_valid: true, id: null, check_in_am: null, check_out_am: null, check_in_pm: null, check_out_pm: null, marked_absent: false }],
        error: null,
      });

    render(<Kiosk />);

    fireEvent.click(await screen.findByRole("button", { name: /ava/i }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));

    expect(await screen.findByText(/hi, parent of ava/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check in/i })).toBeInTheDocument();
  });
});
