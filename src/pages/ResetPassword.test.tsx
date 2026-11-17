import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

const { authValue, updateUserMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  authValue: { session: null as unknown, loading: false },
  updateUserMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authValue,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const renderResetPassword = () =>
  render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<div>Dashboard screen</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("ResetPassword page", () => {
  beforeEach(() => {
    authValue.session = {};
    authValue.loading = false;
    updateUserMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("explains when there is no active recovery session", () => {
    authValue.session = null;
    renderResetPassword();

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("rejects mismatched passwords", async () => {
    renderResetPassword();

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "secret12" } });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Passwords do not match.");
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("updates the password and sends the user to the dashboard", async () => {
    updateUserMock.mockResolvedValue({ error: null });
    renderResetPassword();

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "secret12" } });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), { target: { value: "secret12" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: "secret12" });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Password updated successfully.");
    expect(await screen.findByText("Dashboard screen")).toBeInTheDocument();
  });
});
