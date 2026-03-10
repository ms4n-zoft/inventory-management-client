import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./app";

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
          reservations: [],
          entitlements: [],
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
        screen.getByRole("heading", { name: /inventory overview/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /open catalog setup/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh data/i }),
    ).toBeInTheDocument();
  });
});
