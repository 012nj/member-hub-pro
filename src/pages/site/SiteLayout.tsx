import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from '@/lib/router-compat';
import { Menu, X, ArrowUpRight, Mail, MapPin, HeartHandshake } from 'lucide-react';

export const LOGO = '/images/image%20copy%203.png';

const nav = [
  { label: 'About', to: '/about' },
  { label: 'Leadership', to: '/leadership' },
  { label: 'Projects', to: '/projects' },
  { label: 'News', to: '/news' },
  { label: 'Events', to: '/events' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
];

export function SiteLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === '/' && !scrolled;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);

  return (
    <div className="site-shell min-h-screen flex flex-col">
      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${overHero ? 'bg-transparent' : 'bg-cream/90 backdrop-blur-xl border-b border-line'}`}
        style={overHero ? undefined : { background: 'color-mix(in oklch, var(--s-cream) 88%, transparent)' }}>
        <div className="mx-auto max-w-7xl px-5 lg:px-8 h-[72px] flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={LOGO} alt="KHCWW logo" width={44} height={44} className="h-11 w-11 rounded-full ring-gold object-cover" />
            <span className={`leading-tight ${overHero ? 'text-cream' : 'text-ink'}`}>
              <span className="font-display block text-lg font-semibold">KHCWW</span>
              <span className="hidden sm:block text-[11px] tracking-wide opacity-75">Care · Support · Unity</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map(n => {
              const active = pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${overHero ? 'text-cream/90 hover:text-cream' : active ? 'text-heart bg-ember-soft' : 'text-ink-soft hover:text-ink'}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className={`hidden sm:inline-flex site-btn !py-2.5 ${overHero ? 'site-btn-ghost' : 'site-btn-line'}`}>Member login</Link>
            <Link to="/join" className="hidden sm:inline-flex site-btn site-btn-primary !py-2.5">Join us</Link>
            <button onClick={() => setOpen(o => !o)} aria-label="Menu" className={`lg:hidden p-2 rounded-full ${overHero ? 'text-cream' : 'text-ink'}`}>
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {open && (
          <div className="lg:hidden bg-cream border-t border-line px-5 pb-6 pt-2 site-rise">
            {nav.map(n => (
              <Link key={n.to} to={n.to} className="block py-3 text-lg font-display text-ink border-b border-line">{n.label}</Link>
            ))}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Link to="/login" className="site-btn site-btn-line justify-center">Member login</Link>
              <Link to="/join" className="site-btn site-btn-primary justify-center">Join us</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 pt-20 pb-10">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <img src={LOGO} alt="" width={52} height={52} className="h-13 w-13 rounded-full object-cover" style={{ height: 52, width: 52 }} />
                <p className="font-display text-xl">Kirinyaga Health Care<br />Workers Welfare</p>
              </div>
              <p className="mt-5 max-w-sm text-sm opacity-70 leading-relaxed">A voluntary welfare uniting healthcare workers in Kirinyaga County — standing together in times of need, joy and sorrow.</p>
              <Link to="/join" className="site-btn site-btn-primary mt-6"><HeartHandshake size={18} /> Become a member</Link>
            </div>
            <FooterCol title="Welfare" links={[['About us', '/about'], ['Leadership', '/leadership'], ['Projects', '/projects'], ['Gallery', '/gallery']]} />
            <FooterCol title="Stay updated" links={[['News', '/news'], ['Events', '/events'], ['Contact', '/contact'], ['Member login', '/login']]} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">Reach us</p>
              <ul className="mt-4 space-y-3 text-sm opacity-80">
                <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> Kirinyaga County, Kenya</li>
                <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0" /> <Link to="/contact" className="hover:text-gold">Send us a message</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-6 border-t flex flex-col sm:flex-row justify-between gap-3 text-xs opacity-60" style={{ borderColor: 'oklch(1 0 0 / .12)' }}>
            <p>© {new Date().getFullYear()} KHCWW. All rights reserved.</p>
            <p>Gallery photographs by ianphotography, shared with permission.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">{title}</p>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map(([l, to]) => (
          <li key={to}><Link to={to} className="opacity-80 hover:opacity-100 hover:text-gold inline-flex items-center gap-1">{l}<ArrowUpRight size={13} className="opacity-50" /></Link></li>
        ))}
      </ul>
    </div>
  );
}

export function PageHero({ eyebrow, title, intro, image }: { eyebrow: string; title: string; intro?: string; image?: string }) {
  return (
    <section className="relative overflow-hidden bg-ink text-cream pt-[72px]">
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
      <div className="absolute inset-0 hero-scrim" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8 py-20 md:py-28">
        <span className="site-chip" style={{ background: 'oklch(1 0 0 / .14)', color: 'var(--s-gold)' }}>{eyebrow}</span>
        <h1 className="font-display mt-5 text-4xl md:text-6xl font-semibold max-w-3xl leading-[1.05] site-rise">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg opacity-85 site-rise" style={{ animationDelay: '.1s' }}>{intro}</p>}
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, intro, center }: { eyebrow: string; title: string; intro?: string; center?: boolean }) {
  return (
    <div className={center ? 'text-center mx-auto max-w-2xl' : 'max-w-2xl'}>
      <span className="site-chip">{eyebrow}</span>
      <h2 className="font-display mt-4 text-3xl md:text-5xl font-semibold leading-[1.08] text-ink">{title}</h2>
      {intro && <p className="mt-4 text-lg text-ink-soft leading-relaxed">{intro}</p>}
    </div>
  );
}

export function Initials({ name }: { name: string }) {
  const i = name.replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, '').split(/\s+/).map(s => s[0]).slice(0, 2).join('');
  return <div className="h-full w-full bg-grad grid place-items-center font-display text-5xl text-cream">{i}</div>;
}
