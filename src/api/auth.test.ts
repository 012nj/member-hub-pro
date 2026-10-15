import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./client";
import { authApi, requiresLoginPin } from "./auth";

vi.mock("./client", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("Laravel authentication contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends phone credentials and normalizes Laravel member sessions", async () => {
    vi.mocked(api.post).mockResolvedValue({
      access_token: "session-token",
      user: {
        id: "user-1",
        email: "member@example.test",
        role: "member",
        roles: ["member"],
        member: {
          id: "member-1",
          name: "Test Member",
          phone: "0712345678",
        },
      },
    });

    const session = await authApi.login({ phone: "0712345678", password: "safe-test-password" });

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      phone: "0712345678",
      password: "safe-test-password",
    });
    expect(session).toEqual({
      token: "session-token",
      user: {
        id: "user-1",
        name: "Test Member",
        email: "member@example.test",
        role: "member",
        roles: ["member"],
        member_id: "member-1",
        phone: "0712345678",
        must_change_password: undefined,
      },
    });
  });

  it.each([
    ["patron", "patron"],
    ["vice_chairperson", "vice-chairperson"],
  ])("normalizes the Laravel %s executive role", async (backendRole, frontendRole) => {
    vi.mocked(api.post).mockResolvedValue({
      access_token: "executive-token",
      user: {
        id: "executive-user",
        email: "executive@example.test",
        role: backendRole,
      },
    });

    const session = await authApi.login({ phone: "0712345678", password: "safe-test-password" });

    expect(session.user.role).toBe(frontendRole);
  });

  it("preserves every explicitly assigned Laravel role", async () => {
    vi.mocked(api.post).mockResolvedValue({
      access_token: "multi-role-token",
      user: {
        id: "executive-user",
        email: "executive@example.test",
        role: "member",
        roles: ["member", "treasurer", "vice_chairperson"],
      },
    });

    const session = await authApi.login({ phone: "0712345678", password: "safe-test-password" });

    expect(session.user.roles).toEqual(["member", "treasurer", "vice-chairperson"]);
  });

  it.each(["admin", "super-admin", "treasurer", "secretary", "vice-secretary", "chairperson", "vice-chairperson", "patron", "office"] as const)(
    "requires an additional PIN when a user has the %s role",
    (role) => {
      expect(requiresLoginPin({ id: "role-user", name: "Role User", email: "role@example.test", role })).toBe(true);
    },
  );

  it("does not require an additional PIN for member-only accounts", () => {
    expect(requiresLoginPin({
      id: "member-user",
      name: "Member",
      email: "member@example.test",
      role: "member",
      roles: ["member"],
    })).toBe(false);
  });

  it("uses the Laravel dashboard PIN status and verification endpoints", async () => {
    vi.mocked(api.get).mockResolvedValue({ required: true, configured: false, verified: false });
    vi.mocked(api.post).mockResolvedValue({ access_token: "pin-verified-token", verified: true });

    await expect(authApi.dashboardPinStatus()).resolves.toEqual({ required: true, configured: false, verified: false });
    await expect(authApi.verifyDashboardPin("1234", "1234")).resolves.toEqual({
      access_token: "pin-verified-token",
      verified: true,
    });

    expect(api.get).toHaveBeenCalledWith("/auth/dashboard-pin/status");
    expect(api.post).toHaveBeenCalledWith("/auth/dashboard-pin/verify", {
      pin: "1234",
      pin_confirmation: "1234",
    });
  });
});
