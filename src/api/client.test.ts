import { afterEach, describe, expect, it } from "vitest";

import { clearQueryCache, getDemoMode, setDemoMode, setQueryClientRef } from "./client";

describe("API mode defaults", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps live API mode enabled unless demo mode is explicitly selected", () => {
    expect(getDemoMode()).toBe(false);

    setDemoMode(true);
    expect(getDemoMode()).toBe(true);
  });

  it("clears cached server data when the viewed member changes", () => {
    let cleared = false;
    setQueryClientRef({
      invalidateQueries: () => undefined,
      clear: () => { cleared = true; },
    });

    clearQueryCache();

    expect(cleared).toBe(true);
  });
});
