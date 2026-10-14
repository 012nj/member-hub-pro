import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@/lib/router-compat';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, X, ChevronLeft, ChevronRight, Scale, Vote, Users, HandHeart, Landmark, FileText, Send, CheckCircle2 } from 'lucide-react';
import { siteApi, sections, albumPhotos, heroPhotos, type SiteType } from '@/api/site';
import { PageHero, SectionTitle, Initials } from './SiteLayout';
import { fmtDate } from './siteUtil';

const offices = ['Chairperson', 'Vice Chairperson', 'Secretary', 'Vice Secretary', 'Treasurer', 'Patron'];
const objectives = [
  { icon: Users, t: 'Unite', d: 'Bring healthcare workers in Kirinyaga County together.' },
  { icon: HandHeart, t: 'Support', d: 'Help members in times of need.' },
  { icon: CalendarDays, t: 'Participate', d: 'Stand with one another in times of joy and sorrow.' },
  { icon: Landmark, t: 'Grow', d: 'Support social, economic and professional development.' },
];

/* ───────────── About ───────────── */
export function SiteAbout() {
  const about = useQuery({ queryKey: ['site', 'page', 'about'], queryFn: () => siteApi.show('page', 'about') });
  const parts = sections(about.data?.content);
  return (
    <>
      <PageHero eyebrow="About us" title={about.data?.title ?? 'About KHCWW'} intro={about.data?.excerpt ?? 'A welfare that brings healthcare workers in Kirinyaga County together.'} image={heroPhotos[1]?.url} />
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-24 grid gap-16 lg:grid-cols-[1fr_1.3fr]">
        <div className="lg:sticky lg:top-28 h-fit">
          <img src={albumPhotos[33]?.url} alt="Members in discussion" loading="lazy" className="rounded-[2rem] aspect-[4/5] w-full object-cover shadow-site" />
        </div>
        <div className="space-y-12">
          {parts.map((s, k) => (
            <div key={k} className="site-rise">
              {s.heading && <h2 className="font-display text-3xl text-ink"><span className="text-grad">0{k + 1}.</span> {s.heading}</h2>}
              {s.body.map((b, j) => <p key={j} className="mt-4 text-lg text-ink-soft leading-relaxed">{b}</p>)}
            </div>
          ))}
          {about.isLoading && <div className="h-40 rounded-2xl bg-ember-soft animate-pulse" />}
        </div>
      </section>

      <section className="bg-sand">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-24">
          <SectionTitle center eyebrow="Our constitution" title="What we exist to do." intro="Our objectives as set out in the KHCWW constitution." />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {objectives.map(({ icon: Icon, t, d }) => (
              <div key={t} className="site-card p-8">
                <div className="h-12 w-12 rounded-2xl bg-grad grid place-items-center text-cream"><Icon size={22} /></div>
                <p className="font-display mt-6 text-2xl text-ink">{t}</p>
                <p className="mt-2 text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-24 grid gap-6 lg:grid-cols-3">
        <div className="site-card p-8 lg:col-span-2 bg-ink text-cream" style={{ background: 'var(--s-ink)' }}>
          <Scale className="text-gold" />
          <p className="font-display mt-5 text-3xl">Governance</p>
          <p className="mt-3 opacity-80">The constitution provides for six offices, elected by members:</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {offices.map(o => <span key={o} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: 'oklch(1 0 0 / .1)' }}>{o}</span>)}
          </div>
        </div>
        <div className="site-card p-8">
          <Vote className="text-heart" />
          <p className="font-display mt-5 text-3xl text-ink">Accountability</p>
          <p className="mt-3 text-ink-soft">An annual general meeting, other meetings as needed, and elections every three years.</p>
        </div>
        <div className="site-card p-8 lg:col-span-3 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-4 items-center"><FileText className="text-ember" /><p className="text-lg text-ink">Membership is open and voluntary for healthcare workers in Kirinyaga County.</p></div>
          <Link to="/join" className="site-btn site-btn-primary">Become a member <ArrowRight size={18} /></Link>
        </div>
      </section>
    </>
  );
}

/* ───────────── Leadership ───────────── */
export function SiteLeadership() {
  const q = useQuery({ queryKey: ['site', 'leadership'], queryFn: siteApi.leadership });
  return (
    <>
      <PageHero eyebrow="Leadership" title="The people serving our members." intro="Office bearers elected by members under the KHCWW constitution." image={heroPhotos[4]?.url} />
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-24">
        <div className="grid gap-x-6 gap-y-12 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {(q.data ?? []).map((p, k) => (
            <Link key={p.slug} to={`/leadership/${p.slug}`} className="group site-rise" style={{ animationDelay: `${k * 60}ms` }}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-ember-soft">
                {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <Initials name={p.name} />}
                <div className="absolute inset-0 img-scrim opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="font-display mt-4 text-xl text-ink">{p.name}</p>
              <p className="text-sm font-bold text-heart">{p.role}</p>
              {p.short_bio && <p className="mt-1 text-sm text-ink-soft line-clamp-2">{p.short_bio}</p>}
            </Link>
          ))}
          {q.isLoading && Array.from({ length: 4 }).map((_, k) => <div key={k} className="aspect-[4/5] rounded-[1.75rem] bg-ember-soft animate-pulse" />)}
        </div>
        {q.data?.length === 0 && <p className="text-center text-ink-soft">Leadership profiles will be published soon.</p>}
      </section>
    </>
  );
}

export function SitePerson() {
  const { slug = '' } = useParams<{ slug: string }>();
  const q = useQuery({ queryKey: ['site', 'person', slug], queryFn: () => siteApi.person(slug) });
  const p = q.data;
  return (
    <section className="mx-auto max-w-6xl px-5 lg:px-8 pt-32 pb-24">
      <Link to="/leadership" className="inline-flex items-center gap-2 text-sm font-bold text-heart"><ArrowLeft size={16} /> All leaders</Link>
      {p && (
        <div className="mt-10 grid gap-12 md:grid-cols-[1fr_1.4fr] items-start">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-ember-soft shadow-site">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <Initials name={p.name} />}
          </div>
          <div>
            <span className="site-chip">{p.role}</span>
            <h1 className="font-display mt-4 text-5xl text-ink">{p.name}</h1>
            {p.short_bio && <p className="mt-5 text-xl text-ink-soft">{p.short_bio}</p>}
            {p.biography && sections(p.biography).map((s, k) => <div key={k} className="mt-5">{s.heading && <p className="font-bold text-ink">{s.heading}</p>}{s.body.map((b, j) => <p key={j} className="text-ink-soft leading-relaxed">{b}</p>)}</div>)}
            {p.qualifications && <div className="mt-8 site-card p-6"><p className="text-xs font-bold uppercase tracking-widest text-ember">Qualifications</p><p className="mt-2 text-ink whitespace-pre-line">{p.qualifications}</p></div>}
          </div>
        </div>
      )}
      {q.isError && <p className="mt-10 text-ink-soft">This profile is not available.</p>}
    </section>
  );
}

/* ───────────── Collections (projects / news / events) ───────────── */
const meta: Record<string, { type: SiteType; eyebrow: string; title: string; intro: string; base: string; img: number }> = {
  projects: { type: 'project', eyebrow: 'Projects', title: 'What we are building together.', intro: 'Member-agreed projects that support our social and economic growth.', base: '/projects', img: 2 },
  news: { type: 'article', eyebrow: 'News', title: 'Stories from the welfare.', intro: 'Updates, announcements and moments from our members.', base: '/news', img: 0 },
  events: { type: 'event', eyebrow: 'Events', title: 'Where we meet.', intro: 'General meetings, team building and welfare gatherings.', base: '/events', img: 3 },
};

export function SiteCollection({ kind }: { kind: keyof typeof meta }) {
  const m = meta[kind];
  const q = useQuery({ queryKey: ['site', m.type], queryFn: () => siteApi.list(m.type) });
  const ann = useQuery({ queryKey: ['site', 'announcement'], queryFn: () => siteApi.list('announcement'), enabled: kind === 'news' });
  const items = [...(kind === 'news' ? ann.data ?? [] : []), ...(q.data ?? [])];
  const [lead, ...rest] = items;
  return (
    <>
      <PageHero eyebrow={m.eyebrow} title={m.title} intro={m.intro} image={heroPhotos[m.img]?.url} />
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-20">
        {q.isLoading && <div className="h-80 rounded-[2rem] bg-ember-soft animate-pulse" />}
        {lead && (
          <Link to={`${m.base}/${lead.slug}`} className="site-card group grid md:grid-cols-2">
            <div className="aspect-[16/11] md:aspect-auto overflow-hidden bg-ember-soft">
              {lead.image_url && <img src={lead.image_url} alt={lead.image_alt ?? ''} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <span className="site-chip w-fit">{lead.category ?? m.eyebrow}</span>
              <h2 className="font-display mt-5 text-3xl md:text-4xl text-ink leading-tight">{lead.title}</h2>
              <ItemMeta item={lead} />
              {lead.excerpt && <p className="mt-4 text-lg text-ink-soft">{lead.excerpt}</p>}
              <span className="mt-8 inline-flex items-center gap-2 font-bold text-heart">Read more <ArrowRight size={18} /></span>
            </div>
          </Link>
        )}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map(it => (
            <Link key={it.content_type + it.slug} to={`${m.base}/${it.slug}`} className="site-card group">
              <div className="aspect-[16/10] overflow-hidden bg-ember-soft">
                {it.image_url && <img src={it.image_url} alt={it.image_alt ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-ember">{it.category ?? m.eyebrow}</p>
                <p className="font-display mt-2 text-xl text-ink">{it.title}</p>
                <ItemMeta item={it} />
              </div>
            </Link>
          ))}
        </div>
        {!q.isLoading && items.length === 0 && <p className="text-center text-ink-soft">Nothing published yet — check back soon.</p>}
      </section>
    </>
  );
}

function ItemMeta({ item }: { item: { starts_at?: string | null; location?: string | null; published_at?: string | null; content_type: string } }) {
  if (item.content_type === 'event') {
    return <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-soft">
      {item.starts_at && <span className="inline-flex gap-1.5 items-center"><CalendarDays size={15} /> {fmtDate(item.starts_at, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
      {item.location && <span className="inline-flex gap-1.5 items-center"><MapPin size={15} /> {item.location}</span>}
    </div>;
  }
  return item.published_at ? <p className="mt-2 text-sm text-ink-soft">{fmtDate(item.published_at)}</p> : null;
}

export function SiteDetail({ kind }: { kind: keyof typeof meta }) {
  const m = meta[kind];
  const { slug = '' } = useParams<{ slug: string }>();
  const q = useQuery({ queryKey: ['site', m.type, slug], queryFn: async () => (await siteApi.show(m.type, slug).catch(() => null)) ?? (kind === 'news' ? siteApi.show('announcement', slug) : null) });
  const it = q.data;
  return (
    <article>
      <PageHero eyebrow={it?.category ?? m.eyebrow} title={it?.title ?? ' '} intro={it?.excerpt ?? undefined} image={it?.image_url ?? heroPhotos[m.img]?.url} />
      <div className="mx-auto max-w-3xl px-5 lg:px-8 py-16">
        <Link to={m.base} className="inline-flex items-center gap-2 text-sm font-bold text-heart"><ArrowLeft size={16} /> All {m.eyebrow.toLowerCase()}</Link>
        {it && <ItemMeta item={it} />}
        <div className="mt-8 space-y-8">
          {sections(it?.content).map((s, k) => (
            <div key={k}>
              {s.heading && <h2 className="font-display text-2xl text-ink">{s.heading}</h2>}
              {s.body.map((b, j) => <p key={j} className="mt-3 text-lg text-ink-soft leading-relaxed">{b}</p>)}
            </div>
          ))}
        </div>
        {it?.resource_url && <a href={it.resource_url} target="_blank" rel="noreferrer" className="site-btn site-btn-primary mt-10">Open resource <ArrowRight size={18} /></a>}
        {q.isError || (!q.isLoading && !it) ? <p className="mt-8 text-ink-soft">This item is not available.</p> : null}
      </div>
    </article>
  );
}

/* ───────────── Gallery ───────────── */
export function SiteGallery() {
  const q = useQuery({ queryKey: ['site', 'gallery'], queryFn: () => siteApi.list('gallery') });
  const photos = useMemo(() => {
    const list = (q.data ?? []).filter(g => g.image_url).map(g => ({ url: g.image_url!, alt: g.image_alt ?? g.title, cat: g.category ?? 'Moments' }));
    return list.length ? list : albumPhotos.map(p => ({ url: p.url, alt: 'KHCWW AGM & team building', cat: 'AGM and team building' }));
  }, [q.data]);
  const [shown, setShown] = useState(36);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen(o => (o! + 1) % photos.length);
      if (e.key === 'ArrowLeft') setOpen(o => (o! - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, photos.length]);

  return (
    <>
      <PageHero eyebrow="Gallery" title="Nice moments, together." intro={`${photos.length} photographs from our AGM and team-building day · by ianphotography`} image={heroPhotos[0]?.url} />
      <section className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8 py-16">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [&>*]:mb-3">
          {photos.slice(0, shown).map((p, k) => (
            <button key={p.url} onClick={() => setOpen(k)} className="block w-full overflow-hidden rounded-2xl group break-inside-avoid">
              <img src={p.url} alt={p.alt} loading="lazy" decoding="async" className="w-full h-auto transition-transform duration-700 group-hover:scale-105" />
            </button>
          ))}
        </div>
        {shown < photos.length && (
          <div className="mt-10 text-center">
            <button onClick={() => setShown(s => s + 36)} className="site-btn site-btn-dark">Load more photos ({photos.length - shown} left)</button>
          </div>
        )}
      </section>
      {open !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'oklch(0.1 0.01 40 / .94)' }} onClick={() => setOpen(null)}>
          <img src={photos[open].url} alt={photos[open].alt} className="max-h-[86vh] max-w-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button aria-label="Close" className="absolute top-5 right-5 site-btn site-btn-ghost !p-3"><X /></button>
          <button aria-label="Previous" onClick={e => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} className="absolute left-3 md:left-8 site-btn site-btn-ghost !p-3"><ChevronLeft /></button>
          <button aria-label="Next" onClick={e => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} className="absolute right-3 md:right-8 site-btn site-btn-ghost !p-3"><ChevronRight /></button>
          <p className="absolute bottom-5 text-sm text-cream opacity-70">{open + 1} / {photos.length}</p>
        </div>
      )}
    </>
  );
}

/* ───────────── Contact ───────────── */
export function SiteContact() {
  const [f, setF] = useState({ name: '', email: '', topic: 'general' as const, message: '', website: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState('sending'); setErr('');
    try { await siteApi.contact(f); setState('sent'); } catch (x) { setErr((x as Error).message); setState('error'); }
  };
  return (
    <>
      <PageHero eyebrow="Contact" title="We'd love to hear from you." intro="Membership questions, partnerships or welfare support — send us a message." image={heroPhotos[2]?.url} />
      <section className="mx-auto max-w-3xl px-5 lg:px-8 py-20">
        {state === 'sent' ? (
          <div className="site-card p-10 text-center"><CheckCircle2 className="mx-auto text-ember" size={48} /><p className="font-display mt-4 text-3xl text-ink">Message received</p><p className="mt-2 text-ink-soft">Thank you — the KHCWW team will get back to you.</p></div>
        ) : (
          <form onSubmit={submit} className="site-card p-8 md:p-10 grid gap-5 sm:grid-cols-2">
            <Field label="Full name"><input required minLength={2} className="site-input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email"><input required type="email" className="site-input" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Topic" full>
              <select className="site-input" value={f.topic} onChange={e => setF({ ...f, topic: e.target.value as typeof f.topic })}>
                <option value="general">General enquiry</option><option value="membership">Membership</option><option value="partnerships">Partnerships</option><option value="welfare">Welfare support</option>
              </select>
            </Field>
            <Field label="Message" full><textarea required minLength={10} rows={6} className="site-input" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field>
            <input tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} aria-hidden />
            {err && <p className="sm:col-span-2 text-sm text-heart">{err}</p>}
            <button disabled={state === 'sending'} className="site-btn site-btn-primary sm:col-span-2 justify-center">{state === 'sending' ? 'Sending…' : <>Send message <Send size={16} /></>}</button>
          </form>
        )}
      </section>
    </>
  );
}

export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="block text-sm font-bold text-ink mb-2">{label}</span>{children}</label>;
}
