import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "./Auth";

const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("Auth page", () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset();
    signUpMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("shows monetization copy for the free trial", () => {
    render(<Auth />);

    expect(screen.getByText(/14-day free trial/i)).toBeInTheDocument();
    expect(screen.getByText(/starter/i)).toBeInTheDocument();
    expect(screen.getByText(/\$24\/month/i)).toBeInTheDocument();
  });

  it("submits sign-up through Supabase with the current origin as redirect", async () => {
    signUpMock.mockResolvedValue({ error: null });
    render(<Auth />);

    const signUpTab = screen.getByRole("tab", { name: /sign up/i });
    fireEvent.mouseDown(signUpTab);
    fireEvent.click(signUpTab);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^sign up$/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "secret12" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "secret12",
        options: { emailRedirectTo: window.location.origin },
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Check your email to confirm your account and start your free trial.",
    );
  });

  it("shows a sign-in error from Supabase", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid login" } });
    render(<Auth />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "badpass" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "badpass",
      });
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Invalid login");
  });
});
