import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/lib/router-compat';
import { ArrowRight, HandHeart, Users, Sprout, Sparkles, CalendarDays, ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
import { siteApi, heroPhotos, albumPhotos } from '@/api/site';
import { SectionTitle, Initials } from './SiteLayout';
import { fmtDate } from './siteUtil';

const slides = [
  { title: 'Standing together,\nin every season.', text: 'A voluntary welfare uniting healthcare workers across Kirinyaga County.' },
  { title: 'Care for those\nwho care for us.', text: 'Mutual support for members in times of need, joy and sorrow.' },
  { title: 'Stronger\nas one family.', text: 'Meetings, team building and shared projects that grow every member.' },
  { title: 'Building a future\nwe own together.', text: 'From the welfare cafeteria to new projects agreed by members.' },
  { title: 'Your welfare.\nYour voice.', text: 'Every member takes part in the decisions that shape our welfare.' },
];

export default function SiteHome() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(v => (v + 1) % slides.length), 6500); return () => clearInterval(t); }, []);
  const projects = useQuery({ queryKey: ['site', 'project'], queryFn: () => siteApi.list('project') });
  const news = useQuery({ queryKey: ['site', 'article'], queryFn: () => siteApi.list('article') });
  const events = useQuery({ queryKey: ['site', 'event'], queryFn: () => siteApi.list('event') });
  const people = useQuery({ queryKey: ['site', 'leadership'], queryFn: siteApi.leadership });
  const featured = projects.data?.[0];
  const strip = albumPhotos.filter((_, k) => k % 9 === 0).slice(0, 18);

  return (
    <>
      {/* Hero carousel */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-ink text-cream">
        {heroPhotos.map((p, k) => (
          <div key={p.url} className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: k === i ? 1 : 0 }} aria-hidden={k !== i}>
            <img src={p.url} alt="" className={`h-full w-full object-cover ${k === i ? 'site-kenburns' : ''}`}
              fetchPriority={k === 0 ? 'high' : 'low'} loading={k === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
        <div className="absolute inset-0 hero-scrim" />
        <div className="relative h-full mx-auto max-w-7xl px-5 lg:px-8 flex flex-col justify-end pb-24 md:pb-28">
          <span className="site-chip w-fit" style={{ background: 'oklch(1 0 0 / .14)', color: 'var(--s-gold)' }}>Kirinyaga Health Care Workers Welfare</span>
          <h1 key={i} className="font-display mt-5 whitespace-pre-line text-5xl sm:text-6xl md:text-8xl font-semibold leading-[0.98] max-w-4xl site-rise">{slides[i].title}</h1>
          <p key={'t' + i} className="mt-6 max-w-xl text-lg md:text-xl opacity-90 site-rise" style={{ animationDelay: '.12s' }}>{slides[i].text}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/join" className="site-btn site-btn-primary">Become a member <ArrowRight size={18} /></Link>
            <Link to="/about" className="site-btn site-btn-ghost">Who we are</Link>
          </div>
          <div className="mt-12 flex items-center gap-4">
            <button aria-label="Previous slide" onClick={() => setI((i - 1 + slides.length) % slides.length)} className="site-btn site-btn-ghost !p-2.5"><ChevronLeft size={18} /></button>
            <div className="flex gap-2">
              {slides.map((_, k) => (
                <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className="h-1.5 rounded-full transition-all"
                  style={{ width: k === i ? 44 : 14, background: k === i ? 'var(--s-gold)' : 'oklch(1 0 0 / .4)' }} />
              ))}
            </div>
            <button aria-label="Next slide" onClick={() => setI((i + 1) % slides.length)} className="site-btn site-btn-ghost !p-2.5"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="relative -mt-14 z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: HandHeart, t: 'Care', d: 'Helping members in times of need.' },
            { icon: Users, t: 'Support', d: 'Showing up in times of joy and sorrow.' },
            { icon: Sprout, t: 'Unity', d: 'Social, economic and professional growth.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="site-card p-7 flex gap-5 items-start shadow-site">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-grad grid place-items-center text-cream"><Icon size={22} /></div>
              <div><p className="font-display text-2xl text-ink">{t}</p><p className="mt-1 text-ink-soft">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* About teaser */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-24 md:py-32 grid gap-14 lg:grid-cols-2 items-center">
        <div className="relative">
          <img src={albumPhotos[40]?.url} alt="Members at the AGM" loading="lazy" className="rounded-[2rem] aspect-[4/5] w-full object-cover shadow-site" />
          <img src={albumPhotos[170]?.url} alt="Team building day" loading="lazy" className="hidden sm:block absolute -bottom-10 -right-6 w-1/2 aspect-square object-cover rounded-[1.5rem] border-[6px] shadow-site" style={{ borderColor: 'var(--s-cream)' }} />
        </div>
        <div>
          <SectionTitle eyebrow="Who we are" title="A welfare built by healthcare workers, for healthcare workers." />
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">KHCWW was initiated to strengthen cohesion, relationships, interaction and mutual support among health workers in Kirinyaga County. Membership is open and voluntary, and members decide our activities together through meetings, as our constitution sets out.</p>
          <div className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-6">
            {[['6', 'Elected offices'], ['3 yrs', 'Election cycle'], ['1', 'AGM every year']].map(([n, l]) => (
              <div key={l}><p className="font-display text-4xl text-grad">{n}</p><p className="text-sm text-ink-soft mt-1">{l}</p></div>
            ))}
          </div>
          <Link to="/about" className="site-btn site-btn-dark mt-8">Read our story <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* Featured project */}
      {featured && (
        <section className="bg-ink text-cream">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 py-24 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
            <div className="relative overflow-hidden rounded-[2rem] aspect-[16/11]">
              {featured.image_url && <img src={featured.image_url} alt={featured.image_alt ?? ''} loading="lazy" className="h-full w-full object-cover" />}
              <span className="absolute top-5 left-5 site-chip" style={{ background: 'var(--s-gold)', color: 'var(--s-ink)' }}><Coffee size={14} /> Now opening</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">{featured.category ?? 'Our projects'}</p>
              <h2 className="font-display mt-4 text-4xl md:text-6xl font-semibold leading-[1.05]">{featured.title}</h2>
              <p className="mt-6 text-lg opacity-80 leading-relaxed">{featured.excerpt}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/projects/${featured.slug}`} className="site-btn site-btn-primary">Explore the project <ArrowRight size={18} /></Link>
                <Link to="/projects" className="site-btn site-btn-ghost">All projects</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Moments marquee */}
      <section className="py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 flex flex-wrap items-end justify-between gap-6">
          <SectionTitle eyebrow="Nice moments" title="Memories from our AGM & team building." />
          <Link to="/gallery" className="site-btn site-btn-line">Open the gallery <ArrowRight size={18} /></Link>
        </div>
        <div className="mt-12 flex w-max gap-4 site-marquee">
          {[...strip, ...strip].map((p, k) => (
            <img key={k} src={p.url} alt="" loading="lazy" className="h-64 md:h-80 w-auto rounded-[1.5rem] object-cover" style={{ aspectRatio: `${p.w}/${p.h}` }} />
          ))}
        </div>
      </section>

      {/* News & events */}
      <section className="bg-sand">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-24 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <SectionTitle eyebrow="Latest news" title="What's happening." />
              <Link to="/news" className="text-sm font-bold text-heart inline-flex items-center gap-1 shrink-0">All news <ArrowRight size={16} /></Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {(news.data ?? []).slice(0, 4).map(n => (
                <Link key={n.slug} to={`/news/${n.slug}`} className="site-card group">
                  <div className="aspect-[16/10] overflow-hidden bg-ember-soft">
                    {n.image_url && <img src={n.image_url} alt={n.image_alt ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-ember">{n.category ?? 'News'} · {fmtDate(n.published_at)}</p>
                    <p className="font-display mt-2 text-xl text-ink leading-snug">{n.title}</p>
                  </div>
                </Link>
              ))}
              {news.data?.length === 0 && <p className="text-ink-soft">News will appear here soon.</p>}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <SectionTitle eyebrow="Events" title="Diary." />
              <Link to="/events" className="text-sm font-bold text-heart inline-flex items-center gap-1">All events <ArrowRight size={16} /></Link>
            </div>
            <div className="mt-10 space-y-4">
              {(events.data ?? []).slice(0, 4).map(e => {
                const d = e.starts_at ? new Date(e.starts_at) : null;
                return (
                  <Link key={e.slug} to={`/events/${e.slug}`} className="site-card flex gap-5 p-5 items-center">
                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-grad text-cream grid place-items-center text-center leading-none">
                      {d ? <div><p className="font-display text-2xl">{d.getDate()}</p><p className="text-[10px] font-bold uppercase mt-1">{d.toLocaleString('en', { month: 'short' })}</p></div> : <CalendarDays />}
                    </div>
                    <div className="min-w-0"><p className="font-display text-lg text-ink truncate">{e.title}</p><p className="text-sm text-ink-soft truncate">{e.location ?? e.excerpt}</p></div>
                  </Link>
                );
              })}
              {events.data?.length === 0 && <p className="text-ink-soft">No upcoming events yet.</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      {(people.data?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-7xl px-5 lg:px-8 py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle eyebrow="Leadership" title="Elected to serve every member." />
            <Link to="/leadership" className="site-btn site-btn-line">Meet the team <ArrowRight size={18} /></Link>
          </div>
          <div className="mt-12 grid gap-6 grid-cols-2 md:grid-cols-4">
            {people.data!.slice(0, 4).map(p => (
              <Link key={p.slug} to={`/leadership/${p.slug}`} className="group">
                <div className="aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-ember-soft">
                  {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <Initials name={p.name} />}
                </div>
                <p className="font-display mt-4 text-xl text-ink">{p.name}</p>
                <p className="text-sm font-semibold text-heart">{p.role}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-grad text-cream p-10 md:p-16">
          <div className="absolute inset-0 site-pulse opacity-60" />
          <div className="relative grid gap-8 md:grid-cols-[1.5fr_1fr] items-center">
            <div>
              <Sparkles className="text-gold" />
              <h2 className="font-display mt-4 text-4xl md:text-6xl font-semibold leading-[1.02]">Join the welfare family today.</h2>
              <p className="mt-4 text-lg opacity-90 max-w-xl">Registration takes two minutes. Open to all healthcare workers in Kirinyaga County.</p>
            </div>
            <div className="flex md:justify-end gap-3 flex-wrap">
              <Link to="/join" className="site-btn site-btn-dark">Register now <ArrowRight size={18} /></Link>
              <Link to="/contact" className="site-btn site-btn-ghost">Ask a question</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
