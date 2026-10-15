import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentModal } from "@/components/PaymentModal";
import { mockMember } from "@/api/mock";

vi.mock("@/api/mock", () => ({
  mockMember: {
    stkPush: vi.fn(),
    paymentStatus: vi.fn(),
  },
}));

const mockedMember = vi.mocked(mockMember);

function renderPaymentModal(onSuccess = vi.fn()) {
  return {
    onSuccess,
    ...render(
      <PaymentModal
        open
        onClose={vi.fn()}
        onSuccess={onSuccess}
        amount={300}
        accountRef="KHWWC-TEST"
        paymentType="monthly_contribution"
        transactionDesc="Monthly contribution"
      />,
    ),
  };
}

describe("PaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects an STK payment in demo mode without polling", async () => {
    vi.mocked(mockedMember.stkPush).mockResolvedValue({
      success: false,
      message: "Payments are unavailable in demo mode.",
    });
    const { onSuccess } = renderPaymentModal();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "0712345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Prompt" }));

    expect(await screen.findByText("Payments are unavailable in demo mode.")).toBeTruthy();
    expect(mockedMember.paymentStatus).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("reports success only after the provider status is confirmed", async () => {
    vi.useFakeTimers();
    vi.mocked(mockedMember.stkPush).mockResolvedValue({
      success: true,
      checkoutRequestId: "checkout-123",
      message: "STK push initiated",
    });
    vi.mocked(mockedMember.paymentStatus).mockResolvedValue({
      status: "confirmed",
      final: true,
    });
    const { onSuccess } = renderPaymentModal();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "0712345678" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Prompt" }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("Payment Confirmed")).toBeTruthy();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("does not treat a partial payment as completed", async () => {
    vi.useFakeTimers();
    vi.mocked(mockedMember.stkPush).mockResolvedValue({
      success: true,
      checkoutRequestId: "checkout-partial",
      message: "STK push initiated",
    });
    vi.mocked(mockedMember.paymentStatus).mockResolvedValue({
      status: "partial",
      final: false,
    });
    const { onSuccess } = renderPaymentModal();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "0712345678" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Prompt" }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByText("Check your phone for the M-Pesa prompt")).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not mark a bank transfer paid before verification", () => {
    const { onSuccess } = renderPaymentModal();

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "bank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByText("Bank transfer not yet verified")).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
