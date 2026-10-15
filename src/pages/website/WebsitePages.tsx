import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, FileEdit, Users, Inbox, Image as ImageIcon, Mail,
  LayoutDashboard, Plus, Trash2, Edit, Send, CheckCircle,
  AlertTriangle, Newspaper, FileText, Calendar,
} from 'lucide-react';
import { websiteApi } from '@/api/website';
import { queryKeys } from '@/lib/query';
import {
  Card, PageHeader, StatCard, Badge, Button, Input, Textarea,
  Select, LoadingState, ErrorState, EmptyState, Avatar, Modal,
  ConfirmDialog, DataTable, Pagination, SearchInput,
} from '@/components/ui';
import { formatDate, relativeTime } from '@/lib/format';
import { GenericListPage, GenericFormPage, GenericDashboardPage } from '@/components/GenericPages';

export function WebsiteDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.websiteDashboard, queryFn: () => websiteApi.dashboard() });
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Could not load website management metrics." onRetry={() => refetch()} />;
  const d = data!;
  return (
    <div>
      <PageHeader title="Website Management" subtitle="Content management dashboard" icon={<Globe size={20} />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Content" value={d.total_content} icon={<FileEdit size={18} />} />
        <StatCard label="Published" value={d.published_content} icon={<CheckCircle size={18} />} color="success" />
        <StatCard label="Leadership" value={d.total_people} icon={<Users size={18} />} color="secondary" />
        <StatCard label="Unread Messages" value={d.unread_messages} icon={<Inbox size={18} />} color="warning" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold mb-3">Recent Content</h3>
          <div className="space-y-2">
            {d.recent_content.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div className="min-w-0"><p className="text-sm font-medium text-neutral-700 truncate">{c.title}</p><p className="text-xs text-neutral-400">{c.type} • {formatDate(c.date)}</p></div>
                <Badge status={c.status}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold mb-3">Recent Messages</h3>
          <div className="space-y-2">
            {d.recent_messages.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div className="min-w-0"><p className="text-sm font-medium text-neutral-700 truncate">{m.subject}</p><p className="text-xs text-neutral-400">{m.name} • {relativeTime(m.date)}</p></div>
                {!m.read && <span className="w-2 h-2 rounded-full bg-primary-500" />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function WebsiteContentManagement() {
  return <GenericListPage config={{
    title: 'Content', subtitle: 'Manage website content pages', icon: FileEdit,
    searchPlaceholder: 'Search content...',
    fetchFn: (p) => websiteApi.getContent(p.page, '', { search: p.search, status: p.status }),
    queryKey: (p) => queryKeys.websiteContent(p.page, { search: p.search, status: p.status }),
    statusFilters: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }],
    addLabel: 'New Content',
    columns: [
      { key: 'title', label: 'Title', render: r => <span className="font-medium">{r.title}</span> },
      { key: 'type', label: 'Type' },
      { key: 'author', label: 'Author' },
      { key: 'date', label: 'Date', render: r => formatDate(r.date) },
      { key: 'status', label: 'Status', render: r => <Badge status={r.status}>{r.status}</Badge> },
    ],
  }} />;
}

export function WebsitePeople() {
  const qc = useQueryClient();
  const [editModal, setEditModal] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    member_id: '', display_name: '', title_prefix: '', public_role: '', slug: '',
    short_bio: '', biography: '', qualifications: '', published: false, is_featured: false, sort_order: 0,
  });

  const { data: people, isLoading } = useQuery({ queryKey: queryKeys.websitePeople, queryFn: () => websiteApi.getPeople() });
  const { data: leadershipMembers } = useQuery({
    queryKey: queryKeys.websiteLeadershipMembers,
    queryFn: () => websiteApi.getLeadershipMembers(),
  });
  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => editModal?.id
      ? websiteApi.updatePerson(editModal.id, data)
      : websiteApi.createPerson(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.websitePeople }); setEditModal(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => websiteApi.deletePerson(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.websitePeople }); setDeleteId(null); },
  });

  return (
    <div>
      <PageHeader title="People" subtitle="Manage leadership and public profiles" icon={<Users size={20} />}
        action={<Button onClick={() => { setForm({
          member_id: '', display_name: '', title_prefix: '', public_role: '', slug: '',
          short_bio: '', biography: '', qualifications: '', published: false, is_featured: false, sort_order: 0,
        }); setEditModal({}); }}><Plus size={16} /> Add Person</Button>} />
      <Card className="p-4">
        {isLoading && <LoadingState />}
        {!isLoading && (people || []).length === 0 && <EmptyState icon={<Users size={24} />} title="No people added yet" />}
        {!isLoading && (people || []).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {people!.map((p: any) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={p.name} size="lg" src={p.photo} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-900 truncate">{p.name}</p>
                    <p className="text-xs text-primary-700">{p.title}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => {
                    setForm({
                      member_id: p.member_id ?? '',
                      display_name: p.display_name ?? p.name,
                      title_prefix: p.title_prefix ?? '',
                      public_role: p.role,
                      slug: p.slug,
                      short_bio: p.short_bio ?? '',
                      biography: p.biography ?? '',
                      qualifications: p.qualifications ?? '',
                      published: Boolean(p.published),
                      is_featured: Boolean(p.is_featured),
                      sort_order: Number(p.sort_order ?? 0),
                    });
                    setEditModal(p);
                  }}><Edit size={14} /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)}><Trash2 size={14} /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={editModal?.id ? 'Edit Person' : 'Add Person'}>
        <div className="space-y-4">
          <Select label="Member" value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} required>
            <option value="">Select member</option>
            {(leadershipMembers || []).map(member => <option key={member.member_id} value={member.member_id}>{member.name} · {member.member_number}</option>)}
          </Select>
          <Input label="Display Name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
          <Input label="Public Role" value={form.public_role} onChange={e => setForm({ ...form, public_role: e.target.value })} required />
          <Input label="Title Prefix" value={form.title_prefix} onChange={e => setForm({ ...form, title_prefix: e.target.value })} />
          <Input label="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="dr-john-doe" />
          <Input label="Short Biography" value={form.short_bio} onChange={e => setForm({ ...form, short_bio: e.target.value })} />
          <div><label className="label">Biography</label><Textarea rows={4} value={form.biography} onChange={e => setForm({ ...form, biography: e.target.value })} /></div>
          <Input label="Qualifications" value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} />
          {saveMutation.isError && <p role="alert" className="text-sm text-error-600">Could not save profile. {saveMutation.error instanceof Error ? saveMutation.error.message : 'Please retry.'}</p>}
          <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.member_id || !form.public_role.trim()}>Save</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Archive Person" message="Archive this public profile? It will no longer appear on the website." confirmLabel="Archive" danger />
    </div>
  );
}

export function WebsiteLeadershipMembers() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.websiteLeadershipMembers,
    queryFn: () => websiteApi.getLeadershipMembers(),
  });
  return (
    <div>
      <PageHeader title="Leadership Members" subtitle="Select members to assign leadership positions" icon={<Users size={20} />} />
      <Card className="p-4">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load leadership members." onRetry={() => refetch()} />}
        {!isLoading && (
          <div className="space-y-2">
            {(data || []).map((m: any) => (
              <div key={m.member_id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" src={m.image_url} />
                  <div><p className="text-sm font-medium text-neutral-700">{m.name}</p><p className="text-xs text-neutral-400">{m.member_number} · {m.suggested_public_role}</p></div>
                </div>
                <Badge>{m.profile ? 'Profile assigned' : 'No profile'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function WebsiteContactInbox() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.websiteContactMessages(page),
    queryFn: () => websiteApi.getContactMessages(page),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => websiteApi.markMessageRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website', 'contact-messages'] }),
  });

  return (
    <div>
      <PageHeader title="Contact Messages" subtitle="Inbox of website contact form submissions" icon={<Inbox size={20} />} />
      <Card className="p-4">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load contact messages." onRetry={() => refetch()} />}
        {markRead.isError && <p role="alert" className="mb-3 text-sm text-error-600">Could not mark the message as read.</p>}
        {!isLoading && (result?.data || []).length === 0 && <EmptyState icon={<Inbox size={24} />} title="No messages" />}
        {!isLoading && (result?.data || []).length > 0 && (
          <div className="space-y-2">
            {result.data.map((m: any) => (
              <div key={m.id} className={`p-4 rounded-xl border ${m.read ? 'border-neutral-100' : 'border-primary-200 bg-primary-50/30'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">{m.subject}</p>
                    <p className="text-xs text-neutral-500">From: {m.name} ({m.email}) • {relativeTime(m.date)}</p>
                    <p className="text-sm text-neutral-600 mt-2">{m.message}</p>
                  </div>
                  {!m.read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(m.id)}>Mark Read</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {result && <Pagination currentPage={result.current_page} lastPage={result.last_page} onPage={setPage} />}
      </Card>
    </div>
  );
}

export function WebsiteMedia() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.websiteMedia,
    queryFn: () => websiteApi.getMedia(),
  });
  return (
    <div>
      <PageHeader title="Media Library" subtitle="Browse uploaded website images and files" icon={<ImageIcon size={20} />} />
      <Card className="p-4">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load website media." onRetry={() => refetch()} />}
        {!isLoading && !isError && data?.length === 0 && <EmptyState icon={<ImageIcon size={22} />} title="No media files found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.map((m) => (
              <div key={m.id} className="p-3 rounded-xl border border-neutral-100">
                <div className="w-full aspect-video rounded-lg bg-neutral-100 flex items-center justify-center mb-2 overflow-hidden">
                  {m.type.startsWith('image/') ? <img src={m.url} alt={m.name} className="h-full w-full object-cover" /> : <ImageIcon size={24} className="text-neutral-300" />}
                </div>
                <p className="text-xs font-medium text-neutral-700 truncate">{m.name}</p>
                <p className="text-xs text-neutral-400">{m.size}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function WebsiteSettings({ section = 'general' }: { section?: string }) {
  const sectionName: Record<string, string> = {
    general: 'site',
    contact: 'site',
    appearance: 'site',
  };
  const apiSection = sectionName[section] ?? section;
  const title = section === 'general' ? 'General' : section === 'contact' ? 'Contact' : section === 'appearance' ? 'Appearance' : section;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.websiteSettings(apiSection),
    queryFn: () => websiteApi.getSettings(apiSection),
  });
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState('');
  useEffect(() => {
    if (data) setValues(data);
  }, [data]);
  const save = useMutation({
    mutationFn: (settings: Record<string, unknown>) => websiteApi.updateSettings(apiSection, settings),
    onSuccess: setValues,
  });

  const visibleKeys = Object.keys(data ?? {}).filter(key =>
    key !== 'has_password' &&
    (section === 'general' ? ['site_name', 'tagline'].includes(key)
      : section === 'contact' ? ['contact_email', 'contact_phone', 'address'].includes(key)
      : section === 'appearance' ? ['logo_url'].includes(key)
      : true),
  );

  const updateValue = (key: string, value: unknown) => setValues(current => ({ ...current, [key]: value }));
  const fieldLabel = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const handleSave = () => {
    setFormError('');
    const next = { ...values };
    for (const key of visibleKeys) {
      const original = data?.[key];
      const value = values[key];
      if ((Array.isArray(original) || (original && typeof original === 'object')) && typeof value === 'string') {
        try {
          next[key] = JSON.parse(value);
        } catch {
          setFormError(`${fieldLabel(key)} must be valid JSON.`);
          return;
        }
      }
    }
    save.mutate(next);
  };

  return (
    <div>
      <PageHeader title={`${title} Settings`} subtitle="Edit website configuration" icon={<Globe size={20} />} />
      <Card className="p-5">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load website settings." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && (
          <div className="space-y-4">
            {visibleKeys.map(key => {
              const value = values[key];
              if (typeof data[key] === 'boolean') {
                return (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(value)} onChange={event => updateValue(key, event.target.checked)} />
                    {fieldLabel(key)}
                  </label>
                );
              }
              const complex = Array.isArray(data[key]) || (data[key] !== null && typeof data[key] === 'object');
              const displayValue = typeof value === 'string' ? value : complex ? JSON.stringify(value, null, 2) : String(value ?? '');
              return complex ? (
                <div key={key}>
                  <label className="label">{fieldLabel(key)} (JSON)</label>
                  <Textarea rows={6} value={displayValue} onChange={event => updateValue(key, event.target.value)} />
                </div>
              ) : (
                <Input
                  key={key}
                  label={fieldLabel(key)}
                  type={key.includes('password') ? 'password' : typeof data[key] === 'number' ? 'number' : 'text'}
                  value={displayValue}
                  onChange={event => updateValue(key, typeof data[key] === 'number' ? Number(event.target.value) : event.target.value)}
                />
              );
            })}
            {formError && <p role="alert" className="text-sm text-error-600">{formError}</p>}
            {save.isError && <p role="alert" className="text-sm text-error-600">Could not save settings. {save.error instanceof Error ? save.error.message : 'Please retry.'}</p>}
            {save.isSuccess && <p className="text-sm text-success-700">Settings saved.</p>}
            <Button onClick={handleSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save settings'}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export function WebsiteEmailTemplates() {
  const qc = useQueryClient();
  const [editModal, setEditModal] = useState<any>(null);
  const [form, setForm] = useState({ template_key: '', name: '', subject: '', body: '', enabled: true });
  const [testEmail, setTestEmail] = useState<string | null>(null);
  const [testAddress, setTestAddress] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.websiteEmailTemplates,
    queryFn: () => websiteApi.getEmailTemplates(),
  });
  const saveMutation = useMutation({
    mutationFn: (template: typeof form) => websiteApi.updateEmailTemplate(template.template_key, template),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.websiteEmailTemplates }); setEditModal(null); },
  });
  const testMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => websiteApi.testEmail(id, email),
    onSuccess: () => setTestEmail(null),
  });

  return (
    <div>
      <PageHeader title="Email Templates" subtitle="Manage automated email templates" icon={<Mail size={20} />} />
      <Card className="p-4">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Could not load email templates." onRetry={() => refetch()} />}
        {!isLoading && !isError && (
          <div className="space-y-2">
            {(data || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-100">
                <div><p className="text-sm font-semibold text-neutral-800">{t.name}</p><p className="text-xs text-neutral-400">Subject: {t.subject} · {t.id}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    setForm({
                      template_key: t.id,
                      name: t.name,
                      subject: t.subject,
                      body: t.body,
                      enabled: Boolean(t.enabled),
                    });
                    setEditModal(t);
                  }}><Edit size={14} /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setTestEmail(t.id); setTestAddress(''); }}><Send size={14} /> Test</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Email Template">
        <div className="space-y-4">
          <Input label="Template key" value={form.template_key} disabled />
          <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <div><label className="label">Body</label><Textarea rows={8} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Enabled</label>
          {saveMutation.isError && <p role="alert" className="text-sm text-error-600">Could not save this template. {saveMutation.error instanceof Error ? saveMutation.error.message : 'Please retry.'}</p>}
          <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save Template</Button>
        </div>
      </Modal>

      <Modal
        open={!!testEmail}
        onClose={() => setTestEmail(null)}
        title="Send Test Email"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">This sends a real test email using the selected template.</p>
          <Input label="Recipient email" type="email" value={testAddress} onChange={event => setTestAddress(event.target.value)} required />
          {testMutation.isError && <p role="alert" className="text-sm text-error-600">Email test failed. {testMutation.error instanceof Error ? testMutation.error.message : 'Please retry.'}</p>}
          <Button disabled={!testEmail || !testAddress.trim() || testMutation.isPending} onClick={() => testEmail && testMutation.mutate({ id: testEmail, email: testAddress.trim() })}>
            {testMutation.isPending ? 'Sending…' : 'Send test'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
