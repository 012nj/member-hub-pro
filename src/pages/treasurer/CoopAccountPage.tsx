import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Landmark, RefreshCw, Scale } from 'lucide-react';
import { coopApi } from '@/api/banking';
import { queryKeys } from '@/lib/query';
import {
  Badge, Button, Card, DataTable, ErrorState, Input, LoadingState,
  PageHeader, Pagination, StatCard,
} from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/format';

const today = () => new Date().toISOString().slice(0, 10);

export default function CoopAccountPage() {
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['coop', 'dashboard-summary'],
    queryFn: () => coopApi.getDashboardSummary(),
  });
  const { data: reconciliation } = useQuery({
    queryKey: ['coop', 'reconciliation-status'],
    queryFn: () => coopApi.getReconciliationStatus(),
  });
  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError, refetch: refetchTransactions } = useQuery({
    queryKey: ['coop', 'transactions', page],
    queryFn: () => coopApi.getTransactions({ page, per_page: 50 }),
  });
  const { data: syncHistory } = useQuery({
    queryKey: ['coop', 'sync-history'],
    queryFn: () => coopApi.getSyncHistory(),
  });

  const refreshQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['coop', 'dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['coop', 'reconciliation-status'] });
    queryClient.invalidateQueries({ queryKey: ['coop', 'transactions'] });
    queryClient.invalidateQueries({ queryKey: ['coop', 'sync-history'] });
  };
  const statement = useMutation({
    mutationFn: () => coopApi.getStatement({ from_date: fromDate, to_date: toDate }),
  });
  const sync = useMutation({ mutationFn: () => coopApi.syncFullStatement({ from_date: fromDate, to_date: toDate, page_size: 500 }), onSuccess: refreshQueries });
  const reconcile = useMutation({ mutationFn: () => coopApi.reconcileStatement({ from_date: fromDate, to_date: toDate }), onSuccess: refreshQueries });

  const isDateRangeValid = Boolean(fromDate && toDate && fromDate <= toDate);
  const transactionsPage = transactions?.pagination;
  const transactionRows = transactions?.transactions ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Co-op Bank Account"
        subtitle="View account balances, statements, sync history, and reconciliations"
        icon={<Landmark size={20} />}
        action={<Button variant="secondary" onClick={() => { void refetchSummary(); refreshQueries(); }}><RefreshCw size={15} /> Refresh</Button>}
      />

      {summaryLoading && <LoadingState />}
      {summaryError && <ErrorState message="Could not load Co-op Bank account summary." onRetry={() => refetchSummary()} />}
      {summary && (
        <>
          {summary.balance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="Available balance" value={formatCurrency(summary.balance.available)} icon={<WalletIcon />} color="success" />
              <StatCard label="Booked balance" value={formatCurrency(summary.balance.booked)} icon={<Scale size={18} />} />
              <StatCard label="Pending transfers" value={summary.pending.count} icon={<Activity size={18} />} color="warning" />
            </div>
          )}
          <p className="text-xs text-neutral-500">Currency: {summary.balance.currency}</p>
        </>
      )}

      {summary?.balance.available === 0 && (
        <p className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
          The bank returned a zero available balance. Confirm the account response before treating this as a live balance.
        </p>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-bold text-neutral-900">Statement and reconciliation</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input label="From" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={event => setToDate(event.target.value)} />
          <Button variant="secondary" disabled={!isDateRangeValid || statement.isPending} onClick={() => statement.mutate()}>
            {statement.isPending ? 'Loading…' : 'Fetch statement'}
          </Button>
          <Button disabled={!isDateRangeValid || sync.isPending} onClick={() => sync.mutate()}>
            {sync.isPending ? 'Syncing…' : 'Sync transactions'}
          </Button>
          <Button variant="secondary" disabled={!isDateRangeValid || reconcile.isPending} onClick={() => reconcile.mutate()}>
            {reconcile.isPending ? 'Reconciling…' : 'Reconcile'}
          </Button>
        </div>
        {!isDateRangeValid && <p role="alert" className="mt-2 text-sm text-error-600">Choose a valid date range.</p>}
        {statement.isError && <p role="alert" className="mt-3 text-sm text-error-600">Statement request failed. {statement.error instanceof Error ? statement.error.message : 'Retry the request.'}</p>}
        {sync.isError && <p role="alert" className="mt-3 text-sm text-error-600">Statement sync failed. {sync.error instanceof Error ? sync.error.message : 'Retry the request.'}</p>}
        {reconcile.isError && <p role="alert" className="mt-3 text-sm text-error-600">Reconciliation failed. {reconcile.error instanceof Error ? reconcile.error.message : 'Retry the request.'}</p>}
        {statement.data && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Fetched transactions ({statement.data.transaction_count})</h3>
            <DataTable
              data={statement.data.transactions}
              columns={[
                { key: 'TransactionDate', label: 'Date', render: row => formatDateTime(String(row.TransactionDate ?? row.transaction_date ?? '')) },
                { key: 'TransactionReference', label: 'Reference', render: row => String(row.TransactionReference ?? row.transaction_reference ?? '—') },
                { key: 'Narration', label: 'Description', render: row => String(row.Narration ?? row.description ?? '—') },
                { key: 'Amount', label: 'Amount', render: row => formatCurrency(Number(row.Amount ?? row.amount ?? 0)) },
              ]}
            />
          </div>
        )}
        {sync.data && <p className="mt-3 text-sm text-success-700">{String(sync.data.data.status ?? 'Sync completed')} · {String(sync.data.data.total_transactions ?? 0)} transactions</p>}
        {reconcile.data && <p className="mt-3 text-sm text-success-700">Reconciliation completed for {reconcile.data.account_number}.</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">Bank transactions</h2>
        {transactionsLoading && <LoadingState />}
        {transactionsError && <ErrorState message="Could not load bank transactions." onRetry={() => refetchTransactions()} />}
        {!transactionsLoading && !transactionsError && transactionRows.length === 0 && <p className="text-sm text-neutral-500">No synced bank transactions found.</p>}
        {!transactionsLoading && !transactionsError && transactionRows.length > 0 && (
          <>
            <DataTable
              data={transactionRows}
              columns={[
                { key: 'transaction_date', label: 'Date', render: row => formatDateTime(String(row.transaction_date ?? '')) },
                { key: 'transaction_reference', label: 'Reference' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount', render: row => formatCurrency(Number(row.amount ?? 0)) },
                { key: 'status', label: 'Status', render: row => <Badge>{String(row.status ?? 'unknown')}</Badge> },
                { key: 'member_name', label: 'Member' },
              ]}
            />
            {transactionsPage && <Pagination currentPage={transactionsPage.page} lastPage={transactionsPage.last_page} onPage={setPage} />}
          </>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">Recent reconciliations</h2>
        {(reconciliation?.recent_reconciliation ?? []).length === 0 && <p className="text-sm text-neutral-500">No reconciliation runs found.</p>}
        <div className="space-y-2">
          {(reconciliation?.recent_reconciliation ?? []).map((run, index) => (
            <div key={String(run.id ?? index)} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2 last:border-0">
              <span className="text-sm">{String(run.start_date ?? '')} – {String(run.end_date ?? '')}</span>
              <Badge>{String(run.status ?? 'unknown')}</Badge>
              <span className="text-xs text-neutral-500">Matched {String(run.matched ?? 0)} · unmatched bank {String(run.unmatched_bank ?? 0)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold text-neutral-900">Statement sync history</h2>
        {(syncHistory?.sync_history ?? []).length === 0 && <p className="text-sm text-neutral-500">No sync history found.</p>}
        <div className="space-y-2">
          {(syncHistory?.sync_history ?? []).map((item, index) => (
            <div key={String(item.id ?? index)} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2 last:border-0">
              <span className="text-sm">{String(item.from_date ?? '')} – {String(item.to_date ?? '')}</span>
              <Badge>{String(item.status ?? 'unknown')}</Badge>
              <span className="text-xs text-neutral-500">New {String(item.new_transactions ?? 0)} · unmatched {String(item.unmatched ?? 0)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WalletIcon() {
  return <Landmark size={18} />;
}
