import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Clock, EyeOff, Hand } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/scrap/Shell";
import { Btn, Sticker, Eyebrow, Tape } from "@/components/scrap/Scrap";
import { Doodle } from "@/components/scrap/Doodles";
import { Avatar } from "@/components/Avatar";
import { SayHiSheet } from "@/components/SayHiSheet";
import { archStyle } from "@/lib/archetypes";

const STATUS_LABEL = { sent: "Hello sent", seen: "Seen", accepted: "Connected!", declined: "Not this time" };

const MatchCard = ({ m, i, onHi, onHide, onNotNow }) => {
  const st = archStyle(m.archetype?.id);
  return (
    <motion.article layout initial={{ opacity: 0, y: 40, rotate: i % 2 ? 2 : -2 }} animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.6 : -0.6 }}
      exit={{ opacity: 0, x: 220, rotate: 12, transition: { duration: 0.3 } }} transition={{ delay: i * 0.09, type: "spring", stiffness: 220, damping: 22 }}
      className="relative bg-white rounded-3xl brutal p-4 pt-5" data-testid={`match-card-${m.id}`}>
      <Tape className="-top-3 right-8 rotate-6 !w-16" color={i % 2 ? "tape-pink" : "tape-mint"} />
      <div className="flex gap-3">
        <Avatar name={m.display_name} url={m.photo_url} size={84} tilt={i % 2 ? 3 : -3} />
        <div className="min-w-0 flex-1">
          <h3 className="font-hand text-3xl leading-none break-words" data-testid={`match-name-${m.id}`}>{m.display_name}</h3>
          <p className="text-sm text-[#5C5C66] font-semibold mt-1">{m.team}</p>
          {m.archetype?.name && <span className={`mt-2 inline-block rounded-full border-2 border-[#1E1E24] ${st.chip} px-2.5 py-0.5 text-[11px] font-bold`}>{st.emoji} {m.archetype.name}</span>}
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-amber-50 border-2 border-dashed border-[#1E1E24]/50 p-3">
        <p className="font-mono-x text-[10px] uppercase tracking-widest">why you might click</p>
        <p className="mt-1 text-sm font-semibold leading-snug" data-testid={`match-why-${m.id}`}>
          You both {m.commonalities.length > 1 ? `${m.commonalities.slice(0, -1).join(", ")} and ${m.commonalities[m.commonalities.length - 1]}` : m.commonalities[0]}.
        </p>
      </div>
      {m.obsession && <p className="mt-3 text-sm"><span className="font-bold">Obsessed with:</span> {m.obsession}</p>}
      <div className="mt-4 flex items-center gap-2">
        {m.connection ? (
          <Sticker color={m.connection.status === "accepted" ? "mint" : "yellow"} rotate={-1} className="!text-sm !py-2 flex-1 justify-center" data-testid={`match-status-${m.id}`}>
            {m.connection.outgoing ? STATUS_LABEL[m.connection.status] : "They said hi! Check Inbox"}
          </Sticker>
        ) : (
          <Btn size="sm" className="flex-1 whitespace-nowrap" onClick={() => onHi(m)} data-testid={`match-sayhi-${m.id}`}><Hand className="h-4 w-4" /> Say hi</Btn>
        )}
        <Btn size="sm" variant="paper" className="!px-3" onClick={() => onNotNow(m)} data-testid={`match-notnow-${m.id}`} aria-label="Not now"><Clock className="h-4 w-4" /><span className="hidden min-[400px]:inline">Not now</span></Btn>
        <Btn size="sm" variant="paper" className="!px-3" onClick={() => onHide(m)} data-testid={`match-hide-${m.id}`} aria-label="Hide this person"><EyeOff className="h-4 w-4" /><span className="hidden min-[400px]:inline">Hide</span></Btn>
      </div>
    </motion.article>
  );
};

export default function People() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [spin, setSpin] = useState(false);
  const [sheet, setSheet] = useState(null);

  const load = useCallback(async (refresh = false) => {
    setSpin(true);
    try {
      const { data } = await api.get(`/matches${refresh ? "?refresh=true" : ""}`);
      setData(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSpin(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const drop = (id) => setData((d) => ({ ...d, matches: d.matches.filter((m) => m.id !== id) }));
  const hide = async (m) => { drop(m.id); await api.post(`/matches/${m.id}/hide`); toast(`${m.display_name.split(" ")[0]} won't show up again.`); };
  const notNow = async (m) => { drop(m.id); await api.post(`/matches/${m.id}/not-now`); toast("Got it, maybe another week."); };
  const sent = (id) => setData((d) => ({ ...d, matches: d.matches.map((m) => (m.id === id ? { ...m, connection: { status: "sent", outgoing: true } } : m)) }));

  return (
    <AppShell right={
      <Btn size="sm" variant="yellow" onClick={() => load(true)} data-testid="matches-refresh-btn" aria-label="Refresh matches">
        <motion.span animate={{ rotate: spin ? 360 : 0 }} transition={spin ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}><RefreshCw className="h-4 w-4" /></motion.span> Refresh
      </Btn>
    }>
      <div className="relative">
        <Doodle kind="arrow" className="absolute -top-1 right-2" color="#FF5A5F" size={44} />
        <Eyebrow>people to meet</Eyebrow>
        <h1 className="mt-2 font-hand text-5xl leading-none">Your Scribbld people</h1>
        <p className="mt-2 text-sm text-[#5C5C66]">Coworkers you share the most with. No pressure, no guarantees, just good conversation starters.</p>
      </div>
      {!user.profile?.discoverable && (
        <button type="button" onClick={() => nav("/settings")} data-testid="matches-hidden-banner" className="mt-4 w-full text-left rounded-2xl brutal-sm bg-pink-100 p-3 text-sm">
          <strong>Heads up:</strong> you're hidden, so others can't find you. Tap to turn visibility on.
        </button>
      )}
      <div className="mt-6 flex flex-col gap-6" data-testid="matches-list">
        {!data && [0, 1].map((i) => <div key={i} className="h-60 rounded-3xl bg-white/60 border-2 border-dashed border-[#1E1E24]/30 animate-pulse" />)}
        <AnimatePresence mode="popLayout">
          {data?.matches.map((m, i) => <MatchCard key={m.id} m={m} i={i} onHi={setSheet} onHide={hide} onNotNow={notNow} />)}
        </AnimatePresence>
        {data && data.matches.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 rounded-3xl bg-white brutal" data-testid="matches-empty">
            <p className="text-6xl">🪴</p>
            <p className="mt-3 font-hand text-3xl">Quiet in here…</p>
            <p className="mt-2 text-sm text-[#5C5C66] px-6">No one else is visible yet. Nudge a coworker to take the quiz, then hit refresh.</p>
          </motion.div>
        )}
      </div>
      <SayHiSheet person={sheet} onClose={() => setSheet(null)} onSent={sent} />
    </AppShell>
  );
}
