import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Frame } from "@/components/scrap/Shell";
import { Btn, Logo, Sticker, Tape, Mark } from "@/components/scrap/Scrap";
import { Doodle } from "@/components/scrap/Doodles";

const ERRORS = {
  domain: "That account isn't a @wearescribbld.com one. Try your work Microsoft account.",
  tenant: "That account belongs to a different organisation.",
  failed: "Microsoft sign-in didn't finish. Give it another go.",
  departed: "This account is no longer active. Talk to HR if that's a mistake.",
};

const MsIcon = () => (
  <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden><path fill="#F25022" d="M1 1h9v9H1z" /><path fill="#7FBA00" d="M11 1h9v9h-9z" /><path fill="#00A4EF" d="M1 11h9v9H1z" /><path fill="#FFB900" d="M11 11h9v9h-9z" /></svg>
);

const Collage = () => (
  <div className="relative h-56 my-6" aria-hidden>
    {[
      { c: "bg-teal-200", r: -10, x: "4%", t: "Soft-Landing", d: 0.1 },
      { c: "bg-amber-200", r: 6, x: "28%", t: "Side-Quest", d: 0.25 },
      { c: "bg-indigo-200", r: -4, x: "50%", t: "Rabbit-Hole", d: 0.4 },
      { c: "bg-rose-200", r: 9, x: "70%", t: "Group-Chat", d: 0.55 },
    ].map((p) => (
      <motion.div key={p.t} className={`absolute top-6 w-[30%] max-w-[140px] aspect-[3/4] rounded-xl brutal ${p.c} p-2 flex flex-col justify-end`}
        style={{ left: p.x }}
        initial={{ y: 80, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1, rotate: p.r }}
        whileHover={{ y: -10, rotate: 0, zIndex: 10 }}
        transition={{ delay: p.d, type: "spring", stiffness: 200, damping: 16 }}>
        <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-3 !w-14" />
        <span className="font-hand text-lg leading-tight">The {p.t}</span>
      </motion.div>
    ))}
    <Doodle kind="star" className="absolute -top-2 right-2" color="#F59E0B" fill="#FDE68A" size={36} delay={0.8} />
    <Doodle kind="heart" className="absolute bottom-0 left-2" color="#FF5A5F" size={30} delay={1} rotate={-12} />
  </div>
);

export default function Login() {
  const { config, refresh } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const err = ERRORS[params.get("auth_error")];

  const devLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/dev-login", { email, name });
      await refresh();
      nav("/");
    } catch (ex) {
      toast.error(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame>
      <main className="px-5 pt-6 pb-12 min-h-screen flex flex-col">
        <Logo />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
          <Sticker color="yellow" rotate={-3} wiggle>takes ~20 min · just for fun</Sticker>
          <h1 className="mt-4 font-hand text-5xl sm:text-6xl leading-[0.95]" data-testid="login-title">
            Who's your <span className="text-[#FF5A5F]">Scribbld</span> <span className="squiggle">person?</span>
          </h1>
          <p className="mt-4 text-base text-[#5C5C66] max-w-sm">A tiny BuzzFeed-style side quest. Spill a little personal lore, get a personality card, and find coworkers you'd actually click with.</p>
        </motion.div>
        <Collage />
        {err && <p role="alert" data-testid="login-error" className="mb-4 rounded-xl brutal-sm bg-rose-100 px-4 py-3 text-sm font-semibold">{err}</p>}
        <div className="space-y-3 mt-auto">
          <Btn variant="ink" className="w-full" data-testid="ms-signin-btn" disabled={!config?.microsoft}
            onClick={() => { window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`; }}>
            <MsIcon /> Sign in with Microsoft
          </Btn>
          <p className="text-xs text-center text-[#5C5C66]">
            {config?.microsoft ? `Only @${config.domain} accounts. You'll stay signed in for 30 days.` : "Microsoft sign-in is being connected by your admin."}
          </p>
        </div>
        {config?.dev_login && (
          <motion.form onSubmit={devLogin} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-8 relative rounded-2xl border-2 border-dashed border-[#1E1E24] p-4 bg-white/70" data-testid="dev-login-form">
            <p className="font-mono-x text-[11px] uppercase tracking-widest text-[#5C5C66] flex items-center gap-1"><Mark /> Preview sign-in (testing only)</p>
            <input data-testid="dev-login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${config.domain}`} aria-label="Work email"
              className="mt-3 w-full h-12 rounded-xl brutal-sm px-4 bg-white outline-none focus:bg-amber-50" />
            <input data-testid="dev-login-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (optional)" aria-label="Name"
              className="mt-2 w-full h-12 rounded-xl brutal-sm px-4 bg-white outline-none focus:bg-amber-50" />
            <Btn type="submit" variant="yellow" className="w-full mt-3" loading={busy} data-testid="dev-login-submit">Continue</Btn>
          </motion.form>
        )}
      </main>
    </Frame>
  );
}
