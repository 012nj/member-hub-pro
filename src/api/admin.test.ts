import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";
import { adminApi } from "./admin";

vi.mock("./client", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("admin member contribution mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps raw Laravel contribution dates and payment fields to the UI contract", async () => {
    vi.mocked(api.get).mockResolvedValue([
      {
        id: "contribution-1",
        member_id: "member-1",
        amount: "300.00",
        status: "paid",
        payment_ref: "MPESA-1",
        year: 2026,
        month: 10,
        paid_date: null,
        due_date: "2026-10-01",
        created_at: "2026-10-01T08:00:00Z",
      },
    ]);

    await expect(adminApi.getMemberContributions("member-1")).resolves.toEqual([
      {
        id: "contribution-1",
        member_id: "member-1",
        member_name: "",
        amount: 300,
        type: "monthly",
        status: "confirmed",
        method: "mpesa",
        reference: "MPESA-1",
        period: "2026-10",
        date: "2026-10-01",
      },
    ]);
  });

  it("uses an empty display date when the backend has no contribution date", async () => {
    vi.mocked(api.get).mockResolvedValue([
      {
        id: "contribution-2",
        member_id: "member-1",
        amount: 300,
        status: "pending",
      },
    ]);

    const [contribution] = await adminApi.getMemberContributions("member-1");
    expect(contribution.date).toBe("");
  });
});
