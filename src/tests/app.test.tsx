import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../app";

function getSidebarLink(href: string) {
  return screen
    .getAllByRole("link")
    .find((link) => link.getAttribute("href") === href);
}

describe("app", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [],
          plans: [],
          skus: [],
          inventoryPools: [],
          auditLogs: [],
        }),
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
});
