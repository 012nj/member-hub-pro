import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from '@/lib/router-compat';
import { AlertCircle, Ban, CheckCircle, AlertTriangle, BellRing, Wallet, Coins, Users, Eye } from 'lucide-react';
import { mockAdmin } from '@/api/mock';
import { queryKeys } from '@/lib/query';
import { Card, PageHeader, Badge, Button, LoadingState, ErrorState, EmptyState, SearchInput, StatCard, Modal, Textarea, Select } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/auth/AuthContext';
import type { Defaulter, DefaulterAction } from '@/types';

const ACTION_COPY: Record<DefaulterAction, { title: string; label: string; danger?: boolean; needsMessage?: boolean }> = {
  suspend: { title: 'Suspend member', label: 'Suspend', danger: true },
  activate: { title: 'Activate member', label: 'Activate' },
  warning: { title: 'Send warning', label: 'Send warning', needsMessage: true },
  reminder: { title: 'Send reminder', label: 'Send reminder', needsMessage: true },
};

export function AdminDefaulters() {
  const qc = useQueryClient();
  const location = useLocation();
  const base = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const { startViewAs } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ action: DefaulterAction; rows: Defaulter[] } | null>(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.adminDefaulters,
    queryFn: () => mockAdmin.getDefaulters(),
  });

  const rows = useMemo(() => {
    const all = (data || []) as Defaulter[];
    const q = search.toLowerCase();
    return all.filter(d =>
      (!q || d.member_name.toLowerCase().includes(q) || d.member_number?.toLowerCase().includes(q) || d.phone?.includes(q)) &&
      (!filter || d.status === filter || d.account_status === filter),
    );
  }, [data, search, filter]);

  const totals = useMemo(() => {
    const all = (data || []) as Defaulter[];
    return {
      arrears: all.reduce((s, d) => s + Number(d.contribution_arrears ?? d.outstanding_amount ?? 0), 0),
      penalties: all.reduce((s, d) => s + Number(d.penalty_balance ?? 0), 0),
      suspended: all.filter(d => d.account_status === 'suspended').length,
    };
  }, [data]);

  const run = useMutation({
    mutationFn: async ({ action, rows, msg }: { action: DefaulterAction; rows: Defaulter[]; msg?: string }) => {
      if (rows.length > 1 && (action === 'warning' || action === 'reminder') && !msg) {
        return mockAdmin.defaulterBulk(action, rows.map(r => r.id));
      }
      for (const r of rows) await mockAdmin.defaulterAction(r.id, action, msg ? { message: msg } : undefined);
      return { message: `${ACTION_COPY[action].label} done for ${rows.length} member(s)` };
    },
    onSuccess: (res) => {
      setNotice(res.message);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: queryKeys.adminDefaulters });
    },
    onError: (e: Error) => setNotice(e.message),
  });

  const open = (action: DefaulterAction, list: Defaulter[]) => { setMessage(''); setPending({ action, rows: list }); };
  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedRows = rows.filter(r => selected.has(r.id));

  return (
    <div>
      <PageHeader
        title="Defaulters"
        subtitle="Members with unpaid contributions or unpaid penalties"
        icon={<AlertCircle size={20} />}
        action={<Link to={`${base}/penalty-wallet`} className="btn-secondary inline-flex items-center gap-1.5"><Wallet size={16} /> Penalty wallet</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Defaulters" value={(data || []).length} icon={<Users size={18} />} color="error" />
        <StatCard label="Contribution arrears" value={formatCurrency(totals.arrears)} icon={<Coins size={18} />} color="warning" />
        <StatCard label="Unpaid penalties" value={formatCurrency(totals.penalties)} icon={<Wallet size={18} />} color="accent" />
        <StatCard label="Suspended" value={totals.suspended} icon={<Ban size={18} />} />
      </div>

      <Card className="p-4 mb-4 text-sm text-neutral-600">
        <p className="font-semibold text-neutral-800 mb-1">How defaulters are collected</p>
        A member is listed when a monthly contribution up to this month is unpaid, or a penalty is unpaid. After the grace period set in
        Settings, a penalty is added for each missed month. Penalty payments go into the penalty wallet and clear the oldest penalties first.
      </Card>

      {notice && (
        <div className="mb-4 rounded-xl border border-success-200 bg-success-50 px-4 py-2.5 text-sm text-success-800 flex justify-between">
          <span>{notice}</span><button onClick={() => setNotice(null)} className="font-semibold">×</button>
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search name, member number or phone..." /></div>
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="sm:w-44">
            <option value="">All</option>
            <option value="critical">Critical (3+ months)</option>
            <option value="action">Action (2 months)</option>
            <option value="warning">Warning (1 month)</option>
            <option value="suspended">Suspended</option>
            <option value="active">Active</option>
          </Select>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3 rounded-xl bg-neutral-50 p-2.5">
            <span className="text-sm font-medium mr-2">{selectedRows.length} selected</span>
            <Button size="sm" variant="secondary" onClick={() => open('reminder', selectedRows)}><BellRing size={14} className="inline mr-1" />Remind</Button>
            <Button size="sm" variant="secondary" onClick={() => open('warning', selectedRows)}><AlertTriangle size={14} className="inline mr-1" />Warn</Button>
            <Button size="sm" variant="danger" onClick={() => open('suspend', selectedRows)}><Ban size={14} className="inline mr-1" />Suspend</Button>
            <Button size="sm" onClick={() => open('activate', selectedRows)}><CheckCircle size={14} className="inline mr-1" />Activate</Button>
          </div>
        )}

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load defaulters" onRetry={() => refetch()} />}
        {!isLoading && !isError && rows.length === 0 && <EmptyState icon={<CheckCircle size={24} />} title="No defaulters" />}
        {!isLoading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-400 border-b border-neutral-100">
                  <th className="py-2 pr-2"><input type="checkbox" aria-label="Select all" checked={selected.size === rows.length} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} /></th>
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Missed</th>
                  <th className="py-2 pr-3">Arrears</th>
                  <th className="py-2 pr-3">Penalties</th>
                  <th className="py-2 pr-3">Total owed</th>
                  <th className="py-2 pr-3">Last paid</th>
                  <th className="py-2 pr-3">Account</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const suspended = r.account_status === 'suspended';
                  return (
                    <tr key={r.id} className="border-b border-neutral-50 align-top">
                      <td className="py-3 pr-2"><input type="checkbox" aria-label={`Select ${r.member_name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-neutral-800">{r.member_name}</p>
                        <p className="text-xs text-neutral-400">{r.member_number} • {r.phone}</p>
                        {r.last_notice_at && <p className="text-2xs text-neutral-400">Last notice {formatDate(r.last_notice_at)}</p>}
                      </td>
                      <td className="py-3 pr-3"><Badge status={r.status}>{r.missed_periods} mo</Badge></td>
                      <td className="py-3 pr-3">{formatCurrency(r.contribution_arrears ?? r.outstanding_amount)}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.penalty_balance ?? 0)}{r.penalty_count ? <span className="text-xs text-neutral-400"> ({r.penalty_count})</span> : null}</td>
                      <td className="py-3 pr-3 font-semibold text-error-600">{formatCurrency(r.outstanding_amount)}</td>
                      <td className="py-3 pr-3 text-neutral-500">{r.last_payment_date ? formatDate(r.last_payment_date) : '—'}</td>
                      <td className="py-3 pr-3"><Badge status={suspended ? 'failed' : 'confirmed'}>{suspended ? 'Suspended' : 'Active'}</Badge></td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" title="Send reminder" onClick={() => open('reminder', [r])}><BellRing size={14} /></Button>
                          <Button size="sm" variant="ghost" title="Send warning" onClick={() => open('warning', [r])}><AlertTriangle size={14} /></Button>
                          {suspended
                            ? <Button size="sm" title="Activate" onClick={() => open('activate', [r])}>Activate</Button>
                            : <Button size="sm" variant="danger" title="Suspend" onClick={() => open('suspend', [r])}>Suspend</Button>}
                          <Button size="sm" variant="ghost" title="View as member" onClick={() => { startViewAs({ id: r.id, name: r.member_name, member_number: r.member_number }); window.location.assign('/member'); }}><Eye size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pending && (
        <Modal open onClose={() => setPending(null)} title={ACTION_COPY[pending.action].title} size="sm">
          <p className="text-sm text-neutral-600 mb-3">
            {pending.rows.length === 1 ? pending.rows[0].member_name : `${pending.rows.length} members`} will get an SMS and a notification in their dashboard.
            {pending.action === 'suspend' && ' Suspended members cannot use their account until activated.'}
          </p>
          {ACTION_COPY[pending.action].needsMessage && (
            <Textarea label="Message (optional — leave empty to use the standard message with their balance)" rows={4} value={message} onChange={e => setMessage(e.target.value)} />
          )}
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
            <Button
              variant={ACTION_COPY[pending.action].danger ? 'danger' : 'primary'}
              disabled={run.isPending}
              onClick={() => { run.mutate({ action: pending.action, rows: pending.rows, msg: message.trim() || undefined }); setPending(null); }}
            >
              {ACTION_COPY[pending.action].label}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
