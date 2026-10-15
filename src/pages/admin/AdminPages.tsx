import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GenericListPage, ImportPage, GenericFormPage, GenericDashboardPage } from '@/components/GenericPages';
import { mockAdmin, mockTreasurer } from '@/api/mock';
import { adminApi } from '@/api/admin';
import { queryKeys } from '@/lib/query';
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Input,
  LoadingState, PageHeader, Pagination, Select, Textarea,
} from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Coins, Upload, UserPlus, Users, CreditCard, AlertTriangle,
  MessageSquare, Calendar, FileText, Newspaper, UserCheck,
  AlertCircle, Bell, Settings, Landmark, PenTool, CheckCircle,
  Wallet, HeartHandshake, Megaphone, FileCheck, BadgeCheck,
  ClipboardList,
} from 'lucide-react';

export function AdminContributions() {
  return <GenericListPage config={{
    title: 'Contributions', subtitle: 'Manage all member contributions', icon: Coins,
    searchPlaceholder: 'Search contributions...',
    fetchFn: (p) => mockAdmin.getContributions({ page: p.page, status: p.status }),
    queryKey: (p) => queryKeys.adminContributions(p),
    statusFilters: [{ value: 'confirmed', label: 'Confirmed' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }],
    exportFilename: 'admin-contributions.csv',
    columns: [
      { key: 'member_name', label: 'Member', render: r => <span className="font-medium">{r.member_name}</span> },
      { key: 'amount', label: 'Amount', render: r => <span className="font-semibold">{formatCurrency(r.amount)}</span> },
      { key: 'type', label: 'Type' }, { key: 'method', label: 'Method' },
      { key: 'period', label: 'Period' },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminImport() {
  return <ImportPage title="Import Member Data" icon={Upload} onImport={(file) => mockAdmin.importExcel(file)} />;
}

export function AdminBeneficiaryImport() {
  return <ImportPage title="Import Beneficiaries" icon={UserPlus} onImport={(file) => mockAdmin.importBeneficiaries(file)} />;
}

export function AdminBeneficiaries() {
  return <GenericListPage config={{
    title: 'Beneficiaries', subtitle: 'All member beneficiaries', icon: Users,
    fetchFn: (p) => mockAdmin.getBeneficiaries(p.page), queryKey: (p) => queryKeys.adminBeneficiaries(p.page),
    exportFilename: 'beneficiaries.csv',
    columns: [
      { key: 'name', label: 'Name', render: r => <span className="font-medium">{r.name}</span> },
      { key: 'relationship', label: 'Relationship' },
      { key: 'phone', label: 'Phone' },
      { key: 'percentage', label: 'Percentage', render: r => <Badge>{r.percentage}%</Badge> },
    ],
  }} />;
}

export function AdminPayments() {
  return <GenericListPage config={{
    title: 'Payments', subtitle: 'Review and process payments', icon: CreditCard,
    fetchFn: (p) => mockAdmin.getPayments(p.page), queryKey: (p) => queryKeys.adminPayments(p.page),
    exportFilename: 'payments.csv',
    statusFilters: [{ value: 'confirmed', label: 'Confirmed' }, { value: 'pending', label: 'Pending' }],
    columns: [
      { key: 'member_name', label: 'Member' },
      { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference', render: r => <span className="font-mono text-xs">{r.reference}</span> },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminUnmatchedPayments() {
  return <GenericListPage config={{
    title: 'Unmatched Payments', subtitle: 'Resolve payments without member matches', icon: AlertTriangle,
    fetchFn: () => mockAdmin.getUnmatchedPayments().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminUnmatched,
    columns: [
      { key: 'reference', label: 'Reference', render: r => <span className="font-mono text-xs">{r.reference}</span> },
      { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status="pending">Unmatched</Badge> },
    ],
  }} />;
}

export function AdminBulkSms() {
  return <GenericFormPage
    title="Bulk SMS" subtitle="Send SMS to members" icon={MessageSquare}
    fields={[{ key: 'message', label: 'Message', type: 'textarea', value: '' }]}
    onSubmit={async (data) => { await mockAdmin.sendBulkSms({ message: data.message, recipients: [] }); }}
    submitLabel="Send SMS"
  />;
}

export function AdminEvents() {
  return <GenericListPage config={{
    title: 'Events', subtitle: 'Manage KHWWC events', icon: Calendar,
    fetchFn: () => mockAdmin.getEvents().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminEvents,
    statusFilters: [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }],
    columns: [
      { key: 'title', label: 'Title', render: r => <span className="font-medium">{r.title}</span> },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'location', label: 'Location' },
      { key: 'attendees_count', label: 'Attendees' },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminDocuments() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const queryKey = [...queryKeys.adminDocuments, page, status, search];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => adminApi.getDocuments({ page, status, q: search }),
  });
  const review = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'approve' | 'reject'; notes?: string }) =>
      decision === 'approve' ? adminApi.approveDocument(id, notes) : adminApi.rejectDocument(id, notes ?? ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments }),
  });

  return (
    <div>
      <PageHeader title="Documents" subtitle="Review and manage member documents" icon={<FileText size={20} />} />
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search member or file name..." />
          <Select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="sm:w-48">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
        {review.isError && <p role="alert" className="mb-3 text-sm text-error-600">Could not review the document. {review.error instanceof Error ? review.error.message : 'Please retry.'}</p>}
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load documents." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.data.length === 0 && <EmptyState icon={<FileText size={22} />} title="No documents found" />}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <>
            <DataTable
              data={data.data}
              columns={[
                { key: 'member_name', label: 'Member', render: row => <div><p className="font-medium">{row.member_name ?? row.uploaded_by}</p><p className="text-xs text-neutral-400">{row.member_phone}</p></div> },
                { key: 'title', label: 'Document', render: row => <span className="font-medium">{row.title}</span> },
                { key: 'type', label: 'Type' },
                { key: 'size', label: 'Size' },
                { key: 'date', label: 'Uploaded', render: row => formatDate(row.date) },
                { key: 'status', label: 'Status', render: row => <Badge status={row.status}>{row.status}</Badge> },
                { key: 'actions', label: 'Review', render: row => row.status === 'pending' ? (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: 'approve' })}>Approve</Button>
                    <Button size="sm" variant="ghost" disabled={review.isPending} onClick={() => { setRejectingId(row.id); setRejectNotes(''); }}>Reject</Button>
                  </div>
                ) : null },
              ]}
            />
            <Pagination currentPage={data.current_page} lastPage={data.last_page} onPage={setPage} />
          </>
        )}
      </Card>
      <Modal open={!!rejectingId} onClose={() => setRejectingId(null)} title="Reject document">
        <div className="space-y-4">
          <Textarea label="Reason for rejection" value={rejectNotes} onChange={event => setRejectNotes(event.target.value)} required />
          <Button
            disabled={!rejectNotes.trim() || review.isPending}
            onClick={() => rejectingId && review.mutate(
              { id: rejectingId, decision: 'reject', notes: rejectNotes.trim() },
              { onSuccess: () => setRejectingId(null) },
            )}
          >
            {review.isPending ? 'Submitting…' : 'Confirm rejection'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminNews() {
  return <GenericListPage config={{
    title: 'News', subtitle: 'Create and manage news articles', icon: Newspaper,
    fetchFn: ({ page }) => mockAdmin.getNews(page),
    queryKey: (p) => ['admin', 'news', p.page],
    columns: [
      { key: 'title', label: 'Title', render: r => <span className="font-medium">{r.title}</span> },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    ],
  }} />;
}

export function AdminBeneficiaryRequests() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'pending' | 'reviewed'>('pending');
  const queryKey = ['admin', 'beneficiary-requests', status] as const;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => adminApi.getBeneficiaryRequests(status),
  });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      adminApi.reviewBeneficiaryRequest(id, decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'beneficiary-requests'] }),
  });

  return (
    <div>
      <PageHeader title="Beneficiary Requests" subtitle="Review member beneficiary requests" icon={<UserCheck size={20} />} />
      <Card className="p-4">
        <Select value={status} onChange={event => setStatus(event.target.value as 'pending' | 'reviewed')} className="mb-4 sm:w-48">
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
        </Select>
        {review.isError && <p role="alert" className="mb-3 text-sm text-error-600">Could not update this request. {review.error instanceof Error ? review.error.message : 'Please retry.'}</p>}
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load beneficiary requests." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.length === 0 && <EmptyState icon={<UserCheck size={22} />} title="No requests found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <DataTable
            data={data}
            columns={[
              { key: 'member', label: 'Member', render: row => <div><p className="font-medium">{row.member.name}</p><p className="text-xs text-neutral-400">{row.member.member_id} · {row.member.phone}</p></div> },
              { key: 'request_type', label: 'Request', render: row => <span className="capitalize">{row.request_type}</span> },
              { key: 'beneficiary_name', label: 'Beneficiary', render: row => row.beneficiary_name ?? row.beneficiary_id ?? '—' },
              { key: 'created_at', label: 'Submitted', render: row => formatDate(row.created_at) },
              { key: 'status', label: 'Status', render: row => <Badge status={row.status}>{row.status}</Badge> },
              { key: 'actions', label: 'Review', render: row => row.status === 'pending' ? (
                <div className="flex gap-1">
                  <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="ghost" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: 'rejected' })}>Reject</Button>
                </div>
              ) : row.admin_notes || '—' },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export { AdminDefaulters } from './AdminDefaulters';

export function AdminNotifications() {
  return <GenericListPage config={{
    title: 'Notifications', subtitle: 'System notifications and alerts', icon: Bell,
    fetchFn: () => mockAdmin.getNotifications().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminNotifications,
    columns: [
      { key: 'title', label: 'Title', render: r => <span className="font-medium">{r.title}</span> },
      { key: 'type', label: 'Type', render: r => <Badge status={r.type}>{r.type}</Badge> },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'read', label: 'Read', render: r => <Badge status={r.read ? 'confirmed' : 'pending'}>{r.read ? 'Read' : 'Unread'}</Badge> },
    ],
  }} />;
}

export function AdminSettings() {
  return <GenericFormPage
    title="Settings" subtitle="General application settings" icon={Settings}
    fields={[
      { key: 'org_name', label: 'Organization Name', value: 'Kirinyaga Healthcare Workers Welfare' },
      { key: 'email', label: 'Contact Email', value: 'info@khwwc.co.ke' },
      { key: 'phone', label: 'Contact Phone', value: '+254 700 100 200' },
      { key: 'address', label: 'Address', value: 'Kerugoya, Kirinyaga County' },
    ]}
    onSubmit={async (data) => { await mockAdmin.updateSettings(data); }}
  />;
}

export function AdminBankDiagnostics() {
  return <GenericDashboardPage
    title="Banking Diagnostics" subtitle="Bank connection health and reconciliation" icon={Landmark}
    stats={[
      { label: 'Connection', value: 'Active', icon: CheckCircle, color: 'success' },
      { label: 'Last Sync', value: '1 day ago', icon: Landmark },
      { label: 'Unmatched', value: '2', icon: AlertTriangle, color: 'warning' },
      { label: 'Reconciliation', value: 'KES 33.5K', icon: AlertCircle, color: 'error' },
    ]}
  />;
}

export function AdminOfficeSignatures() {
  return <GenericFormPage
    title="Office Signatures" subtitle="Manage official office signatures" icon={PenTool}
    fields={[{ key: 'chair', label: 'Chairperson Signature', value: 'Dr. Robert Kibochi' }, { key: 'treasurer', label: 'Treasurer Signature', value: 'David Mwangi Kuria' }, { key: 'secretary', label: 'Secretary Signature', value: 'Lucy Wangari Kamau' }]}
    onSubmit={async (data) => { await mockAdmin.updateOfficeSignatures(data); }}
  />;
}

export function AdminVerifyPenaltyPayments() {
  return <GenericListPage config={{
    title: 'Verify Penalty Payments', subtitle: 'Approve pending penalty payments', icon: CheckCircle,
    fetchFn: () => mockAdmin.getPenalties().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminPenalties,
    columns: [
      { key: 'member_name', label: 'Member' },
      { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'reason', label: 'Reason' },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminPenaltyWallet() {
  return <GenericListPage config={{
    title: 'Penalty Wallet', subtitle: 'Penalty wallet transactions', icon: Wallet,
    fetchFn: (p) => mockTreasurer.getPenaltyWallet(p.page), queryKey: (p) => queryKeys.treasurerWallet('penalty', p.page),
    columns: [
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminDonations() {
  return <GenericListPage config={{
    title: 'Donations', subtitle: 'All member donations', icon: HeartHandshake,
    fetchFn: () => mockAdmin.getDonations().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminDonations,
    exportFilename: 'donations.csv',
    columns: [
      { key: 'member_name', label: 'Member' },
      { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'campaign', label: 'Campaign' },
      { key: 'method', label: 'Method' },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminDonationCampaigns() {
  return <GenericListPage config={{
    title: 'Donation Campaigns', subtitle: 'Manage fundraising campaigns', icon: Megaphone,
    fetchFn: () => adminApi.getDonationCampaigns().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminCampaigns,
    columns: [
      { key: 'title', label: 'Campaign', render: r => <span className="font-medium">{r.title}</span> },
      { key: 'raised', label: 'Raised', render: r => formatCurrency(r.raised) },
      { key: 'target', label: 'Target', render: r => formatCurrency(r.target) },
      { key: 'contributors', label: 'Contributors' },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminWithdrawalApproval() {
  return <GenericListPage config={{
    title: 'Withdrawal Approvals', subtitle: 'Approve member withdrawal requests', icon: FileCheck,
    fetchFn: () => mockAdmin.getWithdrawalApprovals().then(d => ({ data: d, current_page: 1, last_page: 1, total: d.length })),
    queryKey: () => queryKeys.adminWithdrawals,
    columns: [
      { key: 'member_name', label: 'Member' },
      { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
      { key: 'reason', label: 'Reason' },
      { key: 'requested_date', label: 'Requested', render: r => formatDate(r.requested_date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminRegistrationSettings() {
  return <GenericFormPage
    title="Registration Settings" subtitle="Configure member registration options" icon={Settings}
    fields={[
      { key: 'reg_open', label: 'Registration Status', type: 'text', value: 'Open' },
      { key: 'fee', label: 'Registration Fee (KES)', type: 'number', value: '5000' },
      { key: 'monthly', label: 'Monthly Contribution (KES)', type: 'number', value: '2000' },
    ]}
    onSubmit={async (data) => { await mockAdmin.updateRegistrationSettings(data); }}
  />;
}

export function AdminRegistrationManagement() {
  return <GenericListPage config={{
    title: 'Registration Management', subtitle: 'Review membership applications', icon: ClipboardList,
    fetchFn: ({ page }) => mockAdmin.getRegistrationApplicants(page),
    queryKey: (p) => ['admin', 'registration-management', p.page],
    columns: [
      { key: 'name', label: 'Applicant' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function AdminRegistrationApiDocs() {
  return <GenericDashboardPage
    title="Registration API Docs" subtitle="API reference for registration integration" icon={Settings}
    stats={[
      { label: 'Endpoint', value: '/api/register', icon: Settings },
      { label: 'Method', value: 'POST', icon: Settings },
      { label: 'Auth', value: 'Public', icon: Settings },
      { label: 'Rate Limit', value: '5/min', icon: Settings },
    ]}
  />;
}

export function AdminExecutiveBadges() {
  return <GenericListPage config={{
    title: 'Executive Badges', subtitle: 'Manage executive role badges and profiles', icon: BadgeCheck,
    fetchFn: ({ page }) => mockAdmin.getExecutiveBadges(page),
    queryKey: (p) => ['admin', 'executive-badges', p.page],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'title', label: 'Title' },
      { key: 'badge', label: 'Badge', render: r => <Badge>{r.badge || 'N/A'}</Badge> },
    ],
  }} />;
}
