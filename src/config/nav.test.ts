import { describe, expect, it } from "vitest";
import { memberBottomNav, navConfig } from "./nav";

describe("member navigation", () => {
  it("includes a contribution payment route in the full sidebar", () => {
    expect(navConfig.member).toContainEqual({
      label: "Pay Contribution",
      path: "/member/welfare-contribution",
      icon: "CreditCard",
    });
  });

  it("keeps contribution payment reachable in the mobile member navigation", () => {
    expect(memberBottomNav).toContainEqual({
      label: "Contribute",
      path: "/member/welfare-contribution",
      icon: "CreditCard",
    });
  });
});
