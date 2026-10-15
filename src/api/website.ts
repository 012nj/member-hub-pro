import { api } from './client';
import type {
  WebsiteContent,
  LeadershipPerson,
  ContactMessage,
  EmailTemplate,
  MediaAsset,
  LeadershipMember,
  Paginated,
} from '@/types';

interface Envelope<T> {
  data: T;
}

interface CmsPage<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

function mapContent(row: Record<string, unknown>): WebsiteContent {
  return {
    ...row,
    id: String(row.id),
    type: String(row.content_type ?? row.type ?? ''),
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    content: String(row.content ?? ''),
    status: (row.status ?? 'draft') as WebsiteContent['status'],
    author: String(row.author ?? ''),
    date: String(row.updated_at ?? row.created_at ?? row.date ?? ''),
    excerpt: typeof row.excerpt === 'string' ? row.excerpt : undefined,
    image: typeof row.image_url === 'string' ? row.image_url : undefined,
  };
}

function mapPerson(row: Record<string, unknown>): LeadershipPerson {
  return {
    ...row,
    id: String(row.id),
    name: String(row.name ?? row.display_name ?? ''),
    title: String(row.title ?? row.role ?? ''),
    position: String(row.position ?? row.role ?? ''),
    bio: String(row.bio ?? row.short_bio ?? row.biography ?? ''),
    photo: typeof row.photo === 'string' ? row.photo : typeof row.image_url === 'string' ? row.image_url : undefined,
    member_id: String(row.member_id ?? ''),
    display_name: typeof row.display_name === 'string' ? row.display_name : null,
    title_prefix: typeof row.title_prefix === 'string' ? row.title_prefix : null,
    public_role: String(row.public_role ?? row.role ?? ''),
    short_bio: typeof row.short_bio === 'string' ? row.short_bio : null,
    biography: typeof row.biography === 'string' ? row.biography : null,
    qualifications: typeof row.qualifications === 'string' ? row.qualifications : null,
    published: row.published === true || row.published === 1,
    is_featured: row.is_featured === true || row.is_featured === 1,
    sort_order: Number(row.sort_order ?? 0),
    order: Number(row.sort_order ?? 0),
  } as LeadershipPerson;
}

function mapMessage(row: Record<string, unknown>): ContactMessage {
  return {
    ...row,
    id: String(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    subject: String(row.subject ?? row.topic ?? ''),
    message: String(row.message ?? ''),
    read: row.read === true || row.status === 'read',
    date: String(row.date ?? row.created_at ?? ''),
  } as ContactMessage;
}

function mapTemplate(row: Record<string, unknown>): EmailTemplate {
  const key = String(row.template_key ?? row.id ?? '');
  return {
    ...row,
    id: key,
    name: String(row.name ?? ''),
    subject: String(row.subject ?? ''),
    body: String(row.body ?? ''),
    variables: [],
    last_modified: String(row.updated_at ?? row.last_modified ?? ''),
    enabled: row.enabled === true || row.enabled === 1,
  } as EmailTemplate;
}

function mapMedia(row: Record<string, unknown>): MediaAsset {
  const path = String(row.object_path ?? row.name ?? '');
  const bytes = Number(row.size_bytes ?? 0);
  const size = bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
  return {
    id: String(row.id),
    name: path.split('/').pop() ?? path,
    type: String(row.mime_type ?? row.type ?? ''),
    size: String(row.size ?? size),
    url: String(row.url ?? ''),
    uploaded_date: String(row.created_at ?? row.uploaded_date ?? ''),
  };
}

function mapPage<T, U>(
  page: CmsPage<T>,
  map: (row: T) => U,
): Paginated<U> {
  return {
    data: page.data.map(map),
    current_page: page.meta.current_page,
    last_page: page.meta.last_page,
    per_page: page.data.length,
    total: page.meta.total,
  };
}

export const websiteApi = {
  dashboard: () => api.get<Envelope<{
    published_by_type: Record<string, number>;
    total_content: number;
    published_content: number;
    draft_content: number;
    published_profiles: number;
    unpublished_profiles: number;
    new_contact_messages: number;
    upcoming_events: number;
    total_people: number;
    unread_messages: number;
    media_count: number;
    recent_content: WebsiteContent[];
    recent_messages: ContactMessage[];
  }>>('/admin/website/dashboard').then(({ data }) => data),

  getContent: (page = 1, contentType = '', filters: { search?: string; status?: string } = {}) =>
    api.get<CmsPage<Record<string, unknown>>>('/admin/website/content', { page, content_type: contentType, ...filters })
      .then((result) => mapPage(result, mapContent)),

  createContent: (data: Partial<WebsiteContent>) =>
    api.post<Envelope<Record<string, unknown>>>('/admin/website/content', data)
      .then(({ data: content }) => mapContent(content)),

  updateContent: (id: string, data: Partial<WebsiteContent>) =>
    api.put<Envelope<Record<string, unknown>>>(`/admin/website/content/${id}`, data)
      .then(({ data: content }) => mapContent(content)),

  archiveContent: (id: string) =>
    api.post<{ message: string }>(`/admin/website/content/${id}/archive`),

  getPeople: () =>
    api.get<CmsPage<Record<string, unknown>>>('/admin/website/people')
      .then((result) => result.data.map(mapPerson)),

  createPerson: (data: Partial<LeadershipPerson>) =>
    api.post<Envelope<Record<string, unknown>>>('/admin/website/people', data)
      .then(({ data: person }) => mapPerson(person)),

  updatePerson: (id: string, data: Partial<LeadershipPerson>) =>
    api.put<Envelope<Record<string, unknown>>>(`/admin/website/people/${id}`, data)
      .then(({ data: person }) => mapPerson(person)),

  deletePerson: (id: string) =>
    api.post<{ message: string }>(`/admin/website/people/${id}/archive`),

  getLeadershipMembers: () =>
    api.get<Envelope<LeadershipMember[]>>('/admin/website/people/leadership-members')
      .then(({ data }) => data),

  getContactMessages: (page = 1) =>
    api.get<CmsPage<Record<string, unknown>>>('/admin/website/contact-messages', { page })
      .then((result) => mapPage(result, mapMessage)),

  markMessageRead: (id: string) =>
    api.post<{ message: string }>(`/admin/website/contact-messages/${id}/mark-read`),

  getMedia: () =>
    api.get<CmsPage<Record<string, unknown>>>('/admin/website/media')
      .then((result) => result.data.map(mapMedia)),

  getSettings: (section: string) =>
    api.get<Envelope<Record<string, unknown>>>(`/admin/website/settings/${section}`)
      .then(({ data }) => data),

  updateSettings: (section: string, data: Record<string, unknown>) =>
    api.put<Envelope<Record<string, unknown>>>(`/admin/website/settings/${section}`, data)
      .then(({ data: settings }) => settings),

  getEmailTemplates: () =>
    api.get<Envelope<Record<string, unknown>[]>>('/admin/website/email-templates')
      .then(({ data }) => data.map(mapTemplate)),

  updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) =>
    api.put<Envelope<Record<string, unknown>>>(`/admin/website/email-templates/${id}`, {
      ...data,
      template_key: id,
    }).then(({ data: template }) => mapTemplate(template)),

  testEmail: (id: string, email: string) =>
    api.post<{ message: string }>('/admin/website/email/test', { template_key: id, to: email }),
};
