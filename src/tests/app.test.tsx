import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app";
import { setStoredAuthSession } from "../lib/auth";

function getSidebarLink(href: string) {
  return screen
    .getAllByRole("link")
    .find((link) => link.getAttribute("href") === href);
}

describe("app", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setStoredAuthSession({
      token: "inventory-token",
      user: {
        _id: "user-1",
        email_id: "ops@example.com",
        first_name: "Inventory",
        last_name: "Operator",
        user_access: "INVENTORY",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | Request | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.endsWith("/auth/me")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              authType: "user",
              user: {
                _id: "user-1",
                email_id: "ops@example.com",
                first_name: "Inventory",
                last_name: "Operator",
                user_access: "INVENTORY",
              },
            }),
          });
        }

        if (url.endsWith("/api/sales")) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            products: [],
            plans: [],
            skus: [],
            inventoryPools: [],
            auditLogs: [],
          }),
        });
      }),
    );
  });

  it("renders the operations dashboard shell", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /create setup/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/create product setup/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh data/i }),
    ).toBeInTheDocument();

    expect(getSidebarLink("/")).toHaveAttribute("data-active", "true");
    expect(getSidebarLink("/view")).not.toHaveAttribute("data-active");
  });

  it("renders the new view page route", async () => {
    window.history.pushState({}, "", "/view");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /view created items/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/watch list/i)).toBeInTheDocument();
    expect(getSidebarLink("/view")).toHaveAttribute("data-active", "true");
    expect(getSidebarLink("/")).not.toHaveAttribute("data-active");
  });

  it("renders the sales page route", async () => {
    window.history.pushState({}, "", "/sales");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /sales records/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/browse sales/i)).toBeInTheDocument();
    expect(getSidebarLink("/sales")).toHaveAttribute("data-active", "true");
  });

  it("redirects guests to the login page", async () => {
    sessionStorage.clear();
    window.history.pushState({}, "", "/audit");
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /sign in/i }),
      ).toBeInTheDocument();
    });
  });
});
