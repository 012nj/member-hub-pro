import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/lib/router-compat';
import { Check, ShieldCheck, Smartphone, Loader2, PartyPopper, Lock } from 'lucide-react';
import { siteApi, albumPhotos } from '@/api/site';
import { Field } from './SitePages';
import { LOGO } from './SiteLayout';

type Step = 'details' | 'pay' | 'done';

export default function SiteJoin() {
  const cfg = useQuery({ queryKey: ['site', 'reg-config'], queryFn: siteApi.registrationConfig });
  const [step, setStep] = useState<Step>('details');
  const [f, setF] = useState({ full_name: '', phone_number: '', department: '', working_location: '', date_of_birth: '' });
  const [payPhone, setPayPhone] = useState('');
  const [regId, setRegId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [paid, setPaid] = useState(false);
  const [approved, setApproved] = useState(false);
  const fee = cfg.data?.registration_fee ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await siteApi.register(f);
      setRegId(r.id); setPayPhone(f.phone_number); setApproved(r.status === 'approved');
      setStep(fee > 0 ? 'pay' : 'done');
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  const pay = async () => {
    setErr(''); setBusy(true);
    try { await siteApi.payFee(regId, payPhone); } catch (x) { setErr((x as Error).message); setBusy(false); }
  };

  // Poll registration status while waiting for the M-Pesa prompt to be completed.
  useEffect(() => {
    if (step !== 'pay' || !busy || !regId) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      try {
        const s = await siteApi.status(regId);
        if (s.payment_status === 'paid') { setPaid(true); setApproved(s.status === 'approved'); setBusy(false); setStep('done'); }
      } catch { /* keep waiting */ }
      if (n > 40) { setBusy(false); setErr('We have not received confirmation yet. If you paid, it will be confirmed shortly.'); }
    }, 3000);
    return () => clearInterval(t);
  }, [step, busy, regId]);

  const closed = cfg.data && !cfg.data.active;

  return (
    <section className="min-h-screen grid lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden lg:block bg-ink">
        <img src={albumPhotos[150]?.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 hero-scrim" />
        <div className="absolute bottom-0 p-14 text-cream">
          <img src={LOGO} alt="" className="h-16 w-16 rounded-full ring-gold" />
          <h1 className="font-display mt-6 text-5xl font-semibold leading-[1.05]">Join a family<br />that has your back.</h1>
          <ul className="mt-8 space-y-3 text-lg opacity-90">
            {['Support in times of need', 'A voice in every decision', 'Shared projects & growth'].map(t => <li key={t} className="flex gap-3 items-center"><span className="h-6 w-6 rounded-full bg-grad grid place-items-center"><Check size={14} /></span>{t}</li>)}
          </ul>
        </div>
      </div>

      <div className="px-5 sm:px-10 lg:px-16 pt-28 pb-16 flex flex-col justify-center">
        <div className="max-w-xl w-full mx-auto">
          <Steps step={step} hasFee={fee > 0} />
          {closed ? (
            <div className="site-card p-10 mt-8 text-center"><Lock className="mx-auto text-ember" /><p className="font-display text-3xl mt-4 text-ink">Registration is closed</p><p className="mt-2 text-ink-soft">New member registration is not open right now. Please check back or <Link to="/contact" className="text-heart font-bold">contact us</Link>.</p></div>
          ) : step === 'details' ? (
            <>
              <h2 className="font-display mt-8 text-4xl text-ink">Become a member</h2>
              <p className="mt-2 text-ink-soft">Open to healthcare workers in Kirinyaga County.{fee > 0 && <> One-time registration fee: <b className="text-ink">KES {fee.toLocaleString()}</b>.</>}</p>
              <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
                <Field label="Full name" full><input required className="site-input" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="As on your ID" /></Field>
                <Field label="Phone number"><input required inputMode="tel" pattern="^(\+?254|0)?[17]\d{8}$" className="site-input" value={f.phone_number} onChange={e => setF({ ...f, phone_number: e.target.value })} placeholder="07XX XXX XXX" /></Field>
                <Field label="Date of birth"><input required type="date" max={new Date().toISOString().slice(0, 10)} className="site-input" value={f.date_of_birth} onChange={e => setF({ ...f, date_of_birth: e.target.value })} /></Field>
                <Field label="Department / cadre"><input required className="site-input" value={f.department} onChange={e => setF({ ...f, department: e.target.value })} placeholder="e.g. Nursing" /></Field>
                <Field label="Working station"><input required className="site-input" value={f.working_location} onChange={e => setF({ ...f, working_location: e.target.value })} placeholder="e.g. Kerugoya County Hospital" /></Field>
                {err && <p className="sm:col-span-2 text-sm text-heart">{err}</p>}
                <button disabled={busy || cfg.isLoading} className="site-btn site-btn-primary sm:col-span-2 justify-center !py-4">{busy ? <Loader2 className="animate-spin" size={18} /> : 'Submit registration'}</button>
                <p className="sm:col-span-2 text-xs text-ink-soft flex gap-2 items-center"><ShieldCheck size={14} /> Your details are used only for welfare membership.</p>
              </form>
            </>
          ) : step === 'pay' ? (
            <div className="mt-8">
              <h2 className="font-display text-4xl text-ink">Pay registration fee</h2>
              <p className="mt-2 text-ink-soft">We'll send an M-Pesa prompt for <b className="text-ink">KES {fee.toLocaleString()}</b>. Enter your PIN on your phone to finish.</p>
              <div className="site-card p-7 mt-8">
                <Field label="M-Pesa phone number"><input className="site-input" inputMode="tel" value={payPhone} onChange={e => setPayPhone(e.target.value)} /></Field>
                {err && <p className="mt-3 text-sm text-heart">{err}</p>}
                <button onClick={pay} disabled={busy || !payPhone} className="site-btn site-btn-primary w-full justify-center mt-5 !py-4">
                  {busy ? <><Loader2 className="animate-spin" size={18} /> Waiting for payment…</> : <><Smartphone size={18} /> Send M-Pesa prompt</>}
                </button>
              </div>
              <button onClick={() => setStep('done')} className="mt-5 text-sm font-bold text-ink-soft underline">I'll pay later</button>
            </div>
          ) : (
            <div className="site-card p-10 mt-8 text-center site-rise">
              <div className="mx-auto h-16 w-16 rounded-full bg-grad grid place-items-center text-cream"><PartyPopper /></div>
              <p className="font-display mt-6 text-4xl text-ink">Karibu, {f.full_name.split(' ')[0] || 'member'}!</p>
              <p className="mt-3 text-ink-soft">
                {approved ? 'Your registration is approved. You will receive your login details by SMS.' : 'Your registration has been received and is waiting for approval by the welfare office.'}
                {fee > 0 && !paid && ' Your registration fee is still pending.'}
              </p>
              <Link to="/" className="site-btn site-btn-dark mt-8">Back to home</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Steps({ step, hasFee }: { step: Step; hasFee: boolean }) {
  const list: [Step, string][] = hasFee ? [['details', 'Details'], ['pay', 'Payment'], ['done', 'Done']] : [['details', 'Details'], ['done', 'Done']];
  const idx = list.findIndex(([s]) => s === step);
  return (
    <div className="flex items-center gap-3">
      {list.map(([s, l], k) => (
        <div key={s} className="flex items-center gap-3">
          <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold ${k <= idx ? 'bg-grad text-cream' : 'bg-sand text-ink-soft'}`}>{k < idx ? <Check size={15} /> : k + 1}</span>
          <span className={`text-sm font-bold ${k <= idx ? 'text-ink' : 'text-ink-soft'}`}>{l}</span>
          {k < list.length - 1 && <span className="w-8 h-px bg-sand" style={{ background: 'var(--s-line)' }} />}
        </div>
      ))}
    </div>
  );
}
