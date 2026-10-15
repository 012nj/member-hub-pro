import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format";

describe("formatDate", () => {
  it("shows a placeholder for missing dates rather than throwing", () => {
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("shows a placeholder for invalid date values", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});
