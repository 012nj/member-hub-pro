import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { mockTreasurer } from "@/api/mock";
import { queryKeys } from "@/lib/query";
import { GenericListPage } from "@/components/GenericPages";
import {
  Card,
  PageHeader,
  Button,
  Input,
  Textarea,
  Badge,
  LoadingState,
  Modal,
  DataTable,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useState } from "react";
import type { Contribution } from "@/types";

export default function ContributionAdjustments() {
  const [adjustModal, setAdjustModal] = useState<Contribution | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const qc = useQueryClient();
  const {
    data: adjustmentData,
    isLoading: adjustmentsLoading,
    isError: adjustmentsError,
    refetch: refetchAdjustments,
  } = useQuery({
    queryKey: queryKeys.treasurerContributionAdjustments,
    queryFn: () => mockTreasurer.getContributionAdjustments(),
  });
  const adjustments = (adjustmentData?.members ?? [])
    .flatMap((member) =>
      member.adjustments.map((adjustment) => ({
        ...adjustment,
        member_name: member.name,
        member_number: member.member_id,
      })),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const mutation = useMutation({
    mutationFn: (data: { id: string; amount: number; reason: string }) =>
      mockTreasurer.adjustContribution(data.id, {
        amount: Number(data.amount),
        reason: data.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasurer", "contributions"] });
      qc.invalidateQueries({ queryKey: queryKeys.treasurerContributionAdjustments });
      qc.invalidateQueries({ queryKey: queryKeys.treasurerDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.memberDashboard });
      setAdjustModal(null);
    },
  });

  return (
    <>
      <GenericListPage
        config={{
          title: "Contribution Adjustments",
          subtitle: "Review and adjust contribution records",
          icon: SlidersHorizontal,
          searchPlaceholder: "Search contributions...",
          fetchFn: (p) =>
            mockTreasurer.getContributions({ page: p.page, search: p.search, status: p.status }),
          queryKey: (p) => queryKeys.treasurerContributions({ ...p, tab: "adjust" }),
          rowAction: (row) => {
            setAdjustModal(row);
            setAmount(String(row.amount));
            setReason("");
          },
          rowActionLabel: "Adjust",
          rowActionIcon: SlidersHorizontal,
          exportFilename: "contributions-adjustments.csv",
          columns: [
            {
              key: "member_name",
              label: "Member",
              render: (r) => <span className="font-medium">{r.member_name}</span>,
            },
            { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
            { key: "period", label: "Period" },
            { key: "date", label: "Date", render: (r) => formatDate(r.date) },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge status={r.status}>{r.status}</Badge>,
            },
          ],
        }}
      />
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title="Adjust Contribution">
        {adjustModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-neutral-50 text-sm">
              <p className="font-medium text-neutral-800">{adjustModal.member_name}</p>
              <p className="text-neutral-500">
                Current: {formatCurrency(adjustModal.amount)} • {adjustModal.period}
              </p>
            </div>
            <Input
              label="New Amount (KES)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div>
              <label className="label">Reason for Adjustment</label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this adjustment is needed..."
                required
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-error-600">Failed to adjust. Try again.</p>
            )}
            <Button
              className="w-full"
              onClick={() =>
                mutation.mutate({ id: adjustModal.id, amount: Number(amount), reason })
              }
              disabled={mutation.isPending || !reason}
            >
              {mutation.isPending ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </div>
        )}
      </Modal>
      <Card className="p-5 mt-5">
        <PageHeader
          title="Adjustment history"
          subtitle="Audited changes applied to member contribution totals"
          icon={<SlidersHorizontal size={20} />}
        />
        {adjustmentsLoading ? (
          <LoadingState text="Loading adjustment history..." />
        ) : adjustmentsError ? (
          <ErrorState
            message="Contribution adjustment history could not be loaded."
            onRetry={() => refetchAdjustments()}
          />
        ) : adjustments.length === 0 ? (
          <EmptyState
            title="No contribution adjustments"
            message="Recorded adjustments will appear here after they are saved."
          />
        ) : (
          <DataTable
            data={adjustments}
            columns={[
              {
                key: "member_name",
                label: "Member",
                render: (row) => (
                  <div>
                    <p className="font-medium">{row.member_name}</p>
                    <p className="text-xs text-neutral-500">{row.member_number}</p>
                  </div>
                ),
              },
              {
                key: "amount_minor",
                label: "Adjustment",
                render: (row) => {
                  const amountMinor = Number(row.amount_minor);
                  return (
                    <span className={amountMinor < 0 ? "text-error-700" : "text-success-700"}>
                      {amountMinor < 0 ? "−" : "+"}
                      {formatCurrency(Math.abs(amountMinor) / 100)}
                    </span>
                  );
                },
              },
              { key: "category", label: "Category" },
              { key: "reason", label: "Reason" },
              { key: "created_at", label: "Date", render: (row) => formatDate(row.created_at) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
