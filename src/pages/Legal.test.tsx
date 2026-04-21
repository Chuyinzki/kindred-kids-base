import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PrivacyPolicy from "./PrivacyPolicy";
import Terms from "./Terms";

describe("Legal pages", () => {
  it("renders payment-provider language in the privacy policy", () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>,
    );

    expect(screen.getByText(/payment providers/i)).toBeInTheDocument();
    expect(screen.getAllByText(/support@kindredkids\.app/i).length).toBeGreaterThan(0);
  });

  it("renders billing and contact language in terms", () => {
    render(
      <MemoryRouter>
        <Terms />
      </MemoryRouter>,
    );

    expect(screen.getByText(/paid subscriptions renew automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/support@kindredkids\.app/i)).toBeInTheDocument();
  });
});
