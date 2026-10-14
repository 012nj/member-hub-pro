// Public website data, wired to the Laravel endpoints under /public/website and
// /functions/v1/member-registration. In demo mode it returns built-in content.
import { api, getDemoMode } from './client';
import gallery from '@/assets/gallery/manifest.json';

export type SiteType = 'page' | 'project' | 'article' | 'event' | 'welfare' | 'gallery' | 'resource' | 'announcement';

export interface SiteItem {
  content_type: SiteType;
  slug: string;
  title: string;
  category?: string | null;
  excerpt?: string | null;
  content?: string | null;
  is_featured?: boolean;
  image_url?: string | null;
  image_alt?: string | null;
  location?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  resource_url?: string | null;
  published_at?: string | null;
}

export interface SitePerson {
  slug: string;
  name: string;
  role: string;
  short_bio?: string | null;
  biography?: string | null;
  qualifications?: string | null;
  image_url?: string | null;
  is_featured?: boolean;
}

export interface RegistrationConfig {
  registration_fee: number;
  active: boolean;
  auto_approve: boolean;
}

export interface Photo { url: string; w: number; h: number; n: number }

export const heroPhotos: Photo[] = gallery.hero;
export const albumPhotos: Photo[] = gallery.photos;
const photo = (n: number) => albumPhotos.find(p => p.n === n)?.url ?? albumPhotos[0].url;

const wait = () => new Promise(r => setTimeout(r, 120));
const unwrap = <T,>(r: { data: T } | T): T => (r && typeof r === 'object' && 'data' in (r as object) ? (r as { data: T }).data : (r as T));

const ABOUT = `Who we are:
Kirinyaga Health Care Workers Welfare (KHCWW) is a voluntary welfare for healthcare workers in Kirinyaga County who are willing to join. It was initiated to strengthen cohesion, relationships, interaction and mutual support among health workers.

Our purpose:
The constitution sets out a shared purpose: bring healthcare workers together and cater for their welfare.

How the welfare is organized:
Members agree on welfare activities through meetings and the decision-making processes in the constitution. The constitution defines the offices of Chairperson, Vice Chairperson, Secretary, Vice Secretary, Treasurer and Patron.

Meetings and accountability:
The constitution provides for an annual general meeting and other meetings as needs arise, and elections every three years.`;

const demoItems: SiteItem[] = [
  { content_type: 'page', slug: 'about', title: 'About KHCWW', category: 'About', excerpt: 'A welfare that brings healthcare workers in Kirinyaga County together.', content: ABOUT },
  { content_type: 'project', slug: 'welfare-cafeteria', title: 'KHCWW Welfare Cafeteria', category: 'Economic empowerment', is_featured: true, image_url: photo(55), image_alt: 'Members serving a meal', excerpt: 'A member-owned cafeteria bringing affordable, wholesome meals to healthcare workers and a sustainable income for the welfare.', content: "In line with the constitution's objective of supporting the social and economic development of members, KHCWW is opening a welfare cafeteria.\n\nWhy a cafeteria:\nHealthcare workers keep long hours. The cafeteria offers affordable, wholesome meals close to work, and its earnings flow back into the welfare.\n\nHow it is run:\nThe project is overseen by the elected office bearers and reported to members at general meetings." },
  { content_type: 'article', slug: 'agm-team-building-gallery-2025', title: 'KHCWW AGM and team-building, 11 December 2025', category: 'Community', is_featured: true, image_url: photo(23), published_at: '2025-12-11', excerpt: 'A photographic archive from our AGM and team-building day.', content: 'The photographs are shared with permission and credited to ianphotography.' },
  { content_type: 'event', slug: 'agm-team-building-2025', title: 'AGM and team-building gathering', category: 'AGM', image_url: photo(199), starts_at: '2025-12-11T09:00:00', location: 'Kirinyaga County', excerpt: 'Members met for the annual general meeting followed by a day of team building.' },
  { content_type: 'welfare', slug: 'member-mutual-support', title: 'Member mutual support', excerpt: 'Supporting members in times of need and encouraging participation in times of joy and sorrow.' },
];

const demoPeople: SitePerson[] = [
  { slug: 'chairperson', name: 'Chairperson', role: 'Chairperson', short_bio: 'Leads the welfare and chairs meetings.' },
  { slug: 'secretary', name: 'Secretary', role: 'Secretary', short_bio: 'Keeps records and communicates with members.' },
  { slug: 'treasurer', name: 'Treasurer', role: 'Treasurer', short_bio: 'Oversees welfare funds and reports to members.' },
];

export const siteApi = {
  async list(type: SiteType, params: Record<string, string | number | boolean> = {}): Promise<SiteItem[]> {
    if (getDemoMode()) {
      await wait();
      if (type === 'gallery') return albumPhotos.map(p => ({ content_type: 'gallery', slug: `p${p.n}`, title: `Photograph ${p.n}`, image_url: p.url, category: 'AGM and team building' }));
      return demoItems.filter(i => i.content_type === type);
    }
    return unwrap(await api.get<{ data: SiteItem[] }>(`/public/website/content/${type}`, params));
  },
  async show(type: SiteType, slug: string): Promise<SiteItem | null> {
    if (getDemoMode()) { await wait(); return demoItems.find(i => i.content_type === type && i.slug === slug) ?? null; }
    return unwrap(await api.get<{ data: SiteItem }>(`/public/website/content/${type}/${slug}`));
  },
  async leadership(): Promise<SitePerson[]> {
    if (getDemoMode()) { await wait(); return demoPeople; }
    return unwrap(await api.get<{ data: SitePerson[] }>('/public/website/leadership'));
  },
  async person(slug: string): Promise<SitePerson | null> {
    if (getDemoMode()) { await wait(); return demoPeople.find(p => p.slug === slug) ?? null; }
    return unwrap(await api.get<{ data: SitePerson }>(`/public/website/people/${slug}`));
  },
  async contact(data: { name: string; email: string; topic: 'general' | 'membership' | 'partnerships' | 'welfare'; message: string; website?: string }) {
    if (getDemoMode()) { await wait(); return { message: 'Message sent' }; }
    return api.post<{ message: string }>('/public/website/contact', data);
  },
  async registrationConfig(): Promise<RegistrationConfig> {
    if (getDemoMode()) { await wait(); return { registration_fee: 500, active: true, auto_approve: false }; }
    return unwrap(await api.get<{ data: RegistrationConfig }>('/functions/v1/member-registration/config'));
  },
  async register(data: { full_name: string; phone_number: string; department: string; working_location: string; date_of_birth: string }) {
    if (getDemoMode()) { await wait(); return { id: 'demo-' + Date.now(), status: 'pending', payment_status: 'unpaid' }; }
    return unwrap(await api.post<{ data: { id: string; status: string; payment_status: string } }>('/functions/v1/member-registration/register', data));
  },
  async payFee(registration_id: string, phone_number: string) {
    if (getDemoMode()) { await wait(); return { checkout_request_id: 'demo' }; }
    return unwrap(await api.post<{ data: { checkout_request_id: string } }>('/functions/v1/member-registration/initiate-payment', { registration_id, phone_number }));
  },
  async status(id: string) {
    if (getDemoMode()) { await wait(); return { status: 'pending', payment_status: 'paid' }; }
    return unwrap(await api.get<{ data: { status: string; payment_status: string } }>(`/functions/v1/member-registration/status/${id}`));
  },
};

/** Splits seeded "Heading:\nbody" text into sections. */
export function sections(text?: string | null): { heading?: string; body: string[] }[] {
  if (!text) return [];
  return text.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines[0].endsWith(':')) return { heading: lines[0].slice(0, -1), body: lines.slice(1) };
    return { body: lines };
  });
}
