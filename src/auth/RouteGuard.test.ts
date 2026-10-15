import { describe, expect, it } from "vitest";

import { getHomePath } from "./RouteGuard";

describe("executive role dashboard paths", () => {
  it.each([
    ["patron", "/patron"],
    ["vice-chairperson", "/vice-chairperson"],
  ] as const)("routes %s to its dashboard", (role, path) => {
    expect(getHomePath(role)).toBe(path);
  });
});
