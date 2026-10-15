import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Users, ArrowLeft, Coins, HeartHandshake, AlertCircle, User as UserIcon, Eye } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui';
import { mockAdmin } from '@/api/mock';
import { adminApi } from '@/api/admin';
import { queryKeys } from '@/lib/query';
import { Card, PageHeader, Badge, Avatar, LoadingState, ErrorState, EmptyState, SearchInput, Select, Pagination, StatCard, DataTable } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import type { UserRole } from '@/types';

const assignableRoles: { role: UserRole; label: string }[] = [
  { role: 'treasurer', label: 'Treasurer' },
  { role: 'secretary', label: 'Secretary' },
  { role: 'vice-secretary', label: 'Vice Secretary' },
  { role: 'chairperson', label: 'Chairperson' },
  { role: 'vice-chairperson', label: 'Vice Chairperson' },
  { role: 'patron', label: 'Patron' },
  { role: 'office', label: 'Office' },
];

type MemberRoleUpdater = (id: string, roles: UserRole[]) => Promise<{ member_id: string; roles: UserRole[] }>;

export function MemberRoleManager({
  member,
  updateRoles = adminApi.updateMemberRoles,
  cacheKey = queryKeys.adminMemberDetail(member.id),
}: {
  member: import('@/types').Member;
  updateRoles?: MemberRoleUpdater;
  cacheKey?: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const [roles, setRoles] = useState<UserRole[]>(member.roles ?? (member.role ? [member.role] : []));
  const mutation = useMutation({
    mutationFn: () => updateRoles(member.id, roles.filter((role) => assignableRoles.some((option) => option.role === role))),
    onSuccess: (result) => {
      setRoles(result.roles);
      queryClient.setQueryData(cacheKey, (current: typeof member | undefined) =>
        current ? { ...current, roles: result.roles } : current,
      );
    },
  });

  useEffect(() => {
    setRoles(member.roles ?? (member.role ? [member.role] : []));
  }, [member.id, member.role, member.roles]);

  return (
    <Card className="p-5 mt-4">
      <h3 className="text-sm font-bold mb-1">Assigned roles</h3>
      <p className="text-xs text-neutral-500 mb-4">The member dashboard remains available. Each selected role adds only its own dashboard and permissions.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {assignableRoles.map(({ role, label }) => (
          <label key={role} className="flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={(event) => setRoles((current) =>
                event.target.checked
                  ? [...current, role]
                  : current.filter((assignedRole) => assignedRole !== role),
              )}
            />
            {label}
          </label>
        ))}
      </div>
      {mutation.isError && <p role="alert" className="mt-3 text-sm text-error-600">Could not update the member's roles. Please retry.</p>}
      {mutation.isSuccess && <p className="mt-3 text-sm text-success-700">Role assignments saved.</p>}
      <Button className="mt-4" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Saving…' : 'Save role assignments'}
      </Button>
    </Card>
  );
}

export function AdminMembers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminMembers({ page, search, status }),
    queryFn: () => mockAdmin.getMembers({ page, search, status }),
  });

  const result = data as any;

  return (
    <div>
      <PageHeader title="Members" subtitle="Manage all KHWWC members" icon={<Users size={20} />} />
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, or member number..." /></div>
          <Select value={status} onChange={e => setStatus(e.target.value)} className="sm:w-40">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        {isLoading && <LoadingState />}
        {!isLoading && result?.data.length === 0 && <EmptyState icon={<Users size={24} />} title="No members found" />}
        {!isLoading && result?.data.length > 0 && (
          <>
            <DataTable
              data={result.data}
              onRowClick={(m: any) => navigate(`/admin/members/${m.id}`)}
              columns={[
                { key: 'name', label: 'Member', render: r => <div className="flex items-center gap-2"><Avatar name={r.name} size="sm" /><div><p className="font-medium text-neutral-800">{r.name}</p><p className="text-xs text-neutral-400">{r.member_number}</p></div></div> },
                { key: 'email', label: 'Contact', render: r => <div><p className="text-sm text-neutral-600">{r.email}</p><p className="text-xs text-neutral-400">{r.phone}</p></div> },
                { key: 'contributions_total', label: 'Contributions', render: r => <span className="font-semibold">{formatCurrency(r.contributions_total)}</span> },
                { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
              ]}
            />
            <Pagination currentPage={result.current_page} lastPage={result.last_page} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

export function AdminMemberDetail() {
  const { memberId = '' } = useParams();
  const navigate = useNavigate();
  const { startViewAs } = useAuth();

  const { data: member, isLoading, isError } = useQuery({
    queryKey: queryKeys.adminMemberDetail(memberId),
    queryFn: () => mockAdmin.getMemberDetail(memberId),
  });

  const { data: contributions } = useQuery({
    queryKey: ['admin', 'member', memberId, 'contributions'],
    queryFn: () => mockAdmin.getMemberContributions(memberId),
  });

  const { data: beneficiaries } = useQuery({
    queryKey: ['admin', 'member', memberId, 'beneficiaries'],
    queryFn: () => mockAdmin.getMemberBeneficiaries(memberId),
  });

  if (isLoading) return <LoadingState />;
  if (isError || !member) return <ErrorState message="Member not found" onRetry={() => navigate('/admin/members')} />;

  return (
    <div>
      <button onClick={() => navigate('/admin/members')} className="inline-flex items-center gap-1.5 text-sm text-primary-700 font-medium mb-4"><ArrowLeft size={16} /> Back to Members</button>
      <PageHeader
        title={member.name}
        subtitle={`${member.member_number} • ${(member.roles ?? [member.role]).join(', ')}`}
        icon={<UserIcon size={20} />}
        action={
          <Button onClick={() => { startViewAs({ id: member.id, name: member.name, member_number: member.member_number }); navigate('/member'); }}>
            <Eye size={16} className="mr-1.5 inline" /> View as member
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Contributions" value={formatCurrency(member.contributions_total)} icon={<Coins size={18} />} />
        <StatCard label="Penalties" value={formatCurrency(member.penalties_total)} icon={<AlertCircle size={18} />} color="warning" />
        <StatCard label="Donations" value={formatCurrency(member.donations_total)} icon={<HeartHandshake size={18} />} color="secondary" />
        <StatCard label="Status" value={member.status} icon={<UserIcon size={18} />} color={member.status === 'active' ? 'success' : 'error'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold mb-3">Member Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-400">Email</dt><dd className="font-medium text-neutral-700">{member.email}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-400">Phone</dt><dd className="font-medium text-neutral-700">{member.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-400">County</dt><dd className="font-medium text-neutral-700">{member.county}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-400">Workplace</dt><dd className="font-medium text-neutral-700">{member.workplace}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-400">Joined</dt><dd className="font-medium text-neutral-700">{formatDate(member.joined_date)}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold mb-3">Beneficiaries</h3>
          {beneficiaries?.length === 0 ? <EmptyState title="No beneficiaries" /> : (
            <div className="space-y-2">
              {beneficiaries?.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div><p className="text-sm font-medium text-neutral-700">{b.name}</p><p className="text-xs text-neutral-400">{b.relationship}</p></div>
                  <Badge>{b.percentage}%</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <MemberRoleManager member={member} />

      <Card className="p-5 mt-4">
        <h3 className="text-sm font-bold mb-3">Recent Contributions</h3>
        {contributions?.length === 0 ? <EmptyState title="No contributions" /> : (
          <DataTable
            data={contributions || []}
            columns={[
              { key: 'amount', label: 'Amount', render: r => formatCurrency(r.amount) },
              { key: 'type', label: 'Type' },
              { key: 'period', label: 'Period' },
              { key: 'date', label: 'Date', render: r => formatDate(r.date) },
              { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
