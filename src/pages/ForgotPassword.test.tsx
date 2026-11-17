import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";

const { resetPasswordMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("ForgotPassword page", () => {
  beforeEach(() => {
    resetPasswordMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("requests a reset email that redirects to the reset page", async () => {
    resetPasswordMock.mockResolvedValue({ error: null });
    render(<ForgotPassword />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith("owner@example.com", {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("shows a Supabase error", async () => {
    resetPasswordMock.mockResolvedValue({ error: { message: "Too many requests" } });
    render(<ForgotPassword />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "owner@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Too many requests");
    });
  });
});
