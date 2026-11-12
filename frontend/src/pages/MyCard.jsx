import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles, PencilLine } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/scrap/Shell";
import { Btn, Sticker, Tape, Eyebrow } from "@/components/scrap/Scrap";
import { Doodle } from "@/components/scrap/Doodles";
import { Avatar } from "@/components/Avatar";
import { archStyle } from "@/lib/archetypes";

const Note = ({ label, text, tilt, color, testid, delay }) => (
  <motion.div initial={{ opacity: 0, y: 20, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: tilt }} transition={{ delay, type: "spring" }}
    className={`relative rounded-xl brutal-sm ${color} p-4`} data-testid={testid}>
    <Tape className="-top-3 left-1/2 -translate-x-1/2 !w-14 rotate-3" />
    <p className="font-mono-x text-[10px] uppercase tracking-widest">{label}</p>
    <p className="mt-1 font-semibold leading-snug break-words">{text}</p>
  </motion.div>
);

export default function MyCard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const p = user.profile;
  const arch = p.archetype || {};
  const st = archStyle(arch.id);

  return (
    <AppShell right={
      <Sticker color={p.discoverable && !p.admin_paused ? "mint" : "white"} rotate={2} data-testid="mycard-visibility-pill">
        {p.discoverable && !p.admin_paused ? <><Eye className="h-3 w-3" /> visible</> : <><EyeOff className="h-3 w-3" /> hidden</>}
      </Sticker>
    }>
      <Eyebrow>your scrapbook card</Eyebrow>
      <motion.article initial={{ opacity: 0, scale: 0.94, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: -0.6 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative mt-4 rounded-3xl brutal-lg grid-paper p-5 pt-7" data-testid="profile-card">
        <Tape className="-top-3 left-10 -rotate-6" color="tape-mint" />
        <Tape className="-top-3 right-10 rotate-6" color="tape-pink" />
        <Doodle kind="star" className="absolute top-3 right-3" color="#F59E0B" fill="#FDE68A" size={34} delay={0.4} />
        <div className="flex gap-4 items-start">
          <Avatar name={p.display_name} url={p.photo_hidden ? null : p.photo_url} size={124} tilt={-4} testid="profile-card-photo" />
          <div className="min-w-0 pt-2">
            <h1 className="font-hand text-4xl leading-none break-words" data-testid="profile-card-name">{p.display_name}</h1>
            <p className="mt-2 text-sm font-semibold text-[#5C5C66]">{p.team}</p>
            <motion.div className="mt-3" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: "spring" }}>
              <span className={`inline-flex items-center gap-1 rounded-full brutal-sm ${st.chip} px-3 py-1 text-xs font-bold rotate-[-2deg]`} data-testid="profile-card-archetype">
                {st.emoji} {arch.name}
              </span>
            </motion.div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Note label="fun fact" text={p.fun_fact} tilt={-1.5} color="bg-amber-100" testid="profile-card-funfact" delay={0.25} />
          <Note label="obsessed with" text={p.obsession} tilt={1.5} color="bg-pink-100" testid="profile-card-obsession" delay={0.4} />
        </div>
        {arch.traits?.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {arch.traits.map((t, i) => <Sticker key={t} color={["yellow", "mint", "blue"][i % 3]} rotate={i % 2 ? 2 : -2}>{t}</Sticker>)}
          </div>
        )}
        <div className="mt-5 rounded-xl bg-white/80 border-2 border-dashed border-[#1E1E24]/40 p-3">
          <p className="font-mono-x text-[10px] uppercase tracking-widest text-[#5C5C66]">my hello for a match</p>
          <p className="mt-1 text-sm italic break-words" data-testid="profile-card-note">"{p.welcome_note}"</p>
        </div>
      </motion.article>
      <div className="mt-8 grid gap-3">
        <Btn onClick={() => nav("/people")} data-testid="mycard-meet-people-btn"><Sparkles className="h-4 w-4" /> Find people to meet</Btn>
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="paper" size="sm" onClick={() => nav("/reveal")} data-testid="mycard-replay-reveal-btn">Replay reveal</Btn>
          <Btn variant="paper" size="sm" onClick={() => nav("/journey?step=1")} data-testid="mycard-edit-btn"><PencilLine className="h-4 w-4" /> Edit answers</Btn>
        </div>
        {!p.discoverable && <p className="text-sm text-center text-[#5C5C66]">You're hidden, so coworkers won't see you. Turn visibility on in Settings.</p>}
      </div>
    </AppShell>
  );
}
