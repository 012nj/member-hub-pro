import { api, getStoredUser, getDemoMode } from './client';

export type MinuteStatus =
  | 'draft'
  | 'submitted_to_secretary'
  | 'pending_chairperson_approval'
  | 'rejected_by_secretary'
  | 'rejected'
  | 'approved';

export interface MinuteAttendance {
  member_id: string;
  status: 'PRESENT' | 'ABSENT_WITH_APOLOGY' | 'ABSENT';
}

export interface MinuteMember {
  id: string;
  user_id: string;
  name: string;
  phone: string;
}

export interface HydratedMinute {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: 'general' | 'executive';
  agenda: string;
  discussions: string;
  decisions: string;
  action_items: string;
  next_meeting_date: string | null;
  status: MinuteStatus;
  prepared_by: string;
  reviewed_by: string | null;
  approved_by: string | null;
  rejection_notes: string | null;
  attendees: { id: string; name: string }[];
  absent_with_apology: { id: string; name: string }[];
  absent_without_apology: { id: string; name: string }[];
  secretary_name: string | null;
  secretary_signature_url: string | null;
  chairperson_name: string | null;
  chairperson_signature_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMinutePayload {
  title: string;
  meeting_date: string;
  meeting_type: 'general' | 'executive';
  agenda?: string;
  discussions?: string;
  decisions?: string;
  action_items?: string;
  next_meeting_date?: string | null;
  attendance: MinuteAttendance[];
  visible_to_members?: string[] | null;
}

export interface SignatureInfo {
  url: string;
  uploaded_at: string;
  name: string;
}

export interface MinuteTemplate {
  id: string;
  name: string;
  meeting_type: 'general' | 'executive';
  title: string | null;
  agenda: string | null;
  discussions: string | null;
  decisions: string | null;
  action_items: string | null;
  is_default?: boolean;
}

export type MinuteTemplateInput = Omit<MinuteTemplate, 'id' | 'is_default'>;

const DEMO_TEMPLATES_KEY = 'khwwc_demo_minute_templates';
const builtInTemplates: MinuteTemplate[] = [
  {
    id: 'tpl-general', name: 'Monthly General Meeting', meeting_type: 'general', title: 'Monthly General Meeting', is_default: true,
    agenda: "1. Opening prayer\n2. Reading and confirmation of previous minutes\n3. Matters arising\n4. Treasurer's report\n5. Welfare cases\n6. AOB\n7. Closing",
    discussions: "MIN 01: Opening — \nMIN 02: Previous minutes — \nMIN 03: Matters arising — \nMIN 04: Treasurer's report — \nMIN 05: Welfare cases — \nMIN 06: AOB — ",
    decisions: '1. \n2. ', action_items: 'Action — Owner — Due date\n1. ',
  },
  {
    id: 'tpl-exec', name: 'Executive Committee Meeting', meeting_type: 'executive', title: 'Executive Committee Meeting', is_default: true,
    agenda: '1. Opening\n2. Confirmation of previous minutes\n3. Financial position & wallets\n4. Defaulters and penalties\n5. Payout approvals\n6. AOB',
    discussions: 'MIN 01: \nMIN 02: \nMIN 03: Financial position — \nMIN 04: Defaulters — \nMIN 05: Payouts — ',
    decisions: '1. ', action_items: 'Action — Owner — Due date\n1. ',
  },
  {
    id: 'tpl-agm', name: 'Annual General Meeting (AGM)', meeting_type: 'general', title: 'Annual General Meeting', is_default: true,
    agenda: "1. Opening & quorum\n2. Adoption of agenda\n3. Previous AGM minutes\n4. Chairperson's report\n5. Audited accounts\n6. Elections\n7. Resolutions\n8. Closing",
    discussions: "MIN 01: Quorum — \nMIN 02: Agenda adopted — \nMIN 03: \nMIN 04: Chairperson's report — \nMIN 05: Accounts — \nMIN 06: Elections — ",
    decisions: 'Resolutions:\n1. ', action_items: 'Action — Owner — Due date\n1. ',
  },
];

function demoTemplates(): MinuteTemplate[] {
  try {
    const raw = localStorage.getItem(DEMO_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : builtInTemplates;
  } catch {
    return builtInTemplates;
  }
}
function saveDemoTemplates(list: MinuteTemplate[]) {
  try { localStorage.setItem(DEMO_TEMPLATES_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export const minuteTemplatesApi = {
  list: async (): Promise<MinuteTemplate[]> =>
    getDemoMode() ? demoTemplates() : api.get<MinuteTemplate[]>('/minutes/templates'),
  create: async (data: MinuteTemplateInput): Promise<MinuteTemplate> => {
    if (getDemoMode()) {
      const t = { ...data, id: `tpl-${Date.now()}`, is_default: false };
      saveDemoTemplates([...demoTemplates(), t]);
      return t;
    }
    return (await api.post<{ data: MinuteTemplate }>('/minutes/templates', data)).data;
  },
  update: async (id: string, data: MinuteTemplateInput): Promise<MinuteTemplate> => {
    if (getDemoMode()) {
      const list = demoTemplates().map(t => (t.id === id ? { ...t, ...data } : t));
      saveDemoTemplates(list);
      return list.find(t => t.id === id)!;
    }
    return (await api.put<{ data: MinuteTemplate }>(`/minutes/templates/${id}`, data)).data;
  },
  remove: async (id: string): Promise<void> => {
    if (getDemoMode()) { saveDemoTemplates(demoTemplates().filter(t => t.id !== id)); return; }
    await api.delete(`/minutes/templates/${id}`);
  },
};

export const minutesApi = {
  list: (filter: 'mine' | 'secretary_pending' | 'pending') =>
    api.get<HydratedMinute[]>(`/minutes?filter=${filter}`),

  get: (id: string) => api.get<HydratedMinute>(`/minutes/${id}`),

  create: (data: CreateMinutePayload) =>
    api.post<{ data: HydratedMinute }>('/minutes', data),

  update: (id: string, data: Partial<CreateMinutePayload>) =>
    api.put<{ data: HydratedMinute }>(`/minutes/${id}`, data),

  delete: (id: string) =>
    api.delete<{ data: { deleted: boolean } }>(`/minutes/${id}`),

  submit: (id: string) =>
    api.post<{ message: string }>(`/minutes/${id}/submit`),

  secretaryReview: (id: string, decision: 'approve' | 'reject', notes?: string) =>
    api.post<{ message: string }>(`/minutes/${id}/secretary-review`, { decision, notes }),

  approve: (id: string) =>
    api.post<{ message: string }>(`/minutes/${id}/approve`),

  reject: (id: string, notes: string) =>
    api.post<{ message: string }>(`/minutes/${id}/reject`, { notes }),

  getExecutiveMembers: () =>
    api.get<MinuteMember[]>('/minutes/executive-members'),

  getMembers: (limit = 1000) =>
    api.get<MinuteMember[]>(`/rest/v1/members?limit=${limit}`),

  getSignature: (role: 'secretary' | 'chairperson') =>
    api.get<SignatureInfo | null>(`/signatures/current?role=${role}`),

  uploadSignature: async (role: string, file: File) => {
    const user = getStoredUser<{ id: string }>();
    if (!user) throw new Error('Please sign in before uploading a signature.');
    const formData = new FormData();
    formData.append('file', file);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const uploaded = await api.upload<{ url: string }>(`/storage/v1/object/signatory-signatures/${user.id}/${role}-${Date.now()}.${extension}`, formData);
    await api.post('/signatures', { signatory_role: role, signature_url: uploaded.url });
    return { message: 'Signature saved', url: uploaded.url };
  },
};
