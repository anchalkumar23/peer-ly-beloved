import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/scrap/Shell";
import { Btn, Eyebrow, Sticker } from "@/components/scrap/Scrap";
import { Avatar } from "@/components/Avatar";
import { celebrate } from "@/lib/confetti";

const STAGES = ["sent", "seen", "answered"];

const Tracker = ({ status, testid }) => {
  const reached = status === "sent" ? 0 : status === "seen" ? 1 : 2;
  const last = status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : "Answer";
  return (
    <ol className="mt-3 flex items-center gap-1" data-testid={testid} aria-label={`Status: ${status}`}>
      {STAGES.map((s, i) => (
        <li key={s} className="flex items-center gap-1 flex-1 last:flex-none">
          <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: i * 0.12 }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-2 border-[#1E1E24] whitespace-nowrap
              ${i <= reached ? (i === 2 && status === "declined" ? "bg-slate-200" : i === 2 ? "bg-emerald-300" : "bg-amber-300") : "bg-white text-[#5C5C66]"}`}>
            {i === 0 ? "Sent" : i === 1 ? "Seen" : last}
          </motion.span>
          {i < 2 && <span className={`h-0.5 flex-1 ${i < reached ? "bg-[#1E1E24]" : "bg-[#1E1E24]/20"}`} />}
        </li>
      ))}
    </ol>
  );
};

const Item = ({ c, incoming, onRespond, i }) => (
  <motion.article layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
    className="relative bg-white rounded-2xl brutal p-4" data-testid={`conn-${c.id}`}>
    <div className="flex gap-3">
      <Avatar name={c.person.display_name} url={c.person.photo_url} size={56} tilt={i % 2 ? 2 : -2} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{incoming ? `${c.person.display_name} said hi` : `You → ${c.person.display_name}`}</p>
        <p className="text-xs text-[#5C5C66]">{c.person.team}{c.person.archetype?.name ? ` · ${c.person.archetype.name}` : ""}</p>
      </div>
    </div>
    <p className="mt-3 rounded-xl lined-paper border-2 border-[#1E1E24]/20 px-3 py-1 text-sm break-words">"{c.message}"</p>
    {incoming && ["sent", "seen"].includes(c.status) && (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Btn size="sm" variant="paper" onClick={() => onRespond(c, false)} data-testid={`conn-decline-${c.id}`}><X className="h-4 w-4" /> Decline</Btn>
        <Btn size="sm" onClick={() => onRespond(c, true)} data-testid={`conn-accept-${c.id}`}><Check className="h-4 w-4" /> Accept</Btn>
      </div>
    )}
    {incoming && c.status === "declined" && <p className="mt-3 text-xs text-[#5C5C66]">You declined. They won't be told why.</p>}
    {!incoming && <Tracker status={c.status} testid={`conn-tracker-${c.id}`} />}
    {c.status === "accepted" && c.person.email && (
      <a href={`mailto:${c.person.email}`} className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-100 border-2 border-[#1E1E24] px-3 py-2 text-sm font-semibold break-all" data-testid={`conn-email-${c.id}`}>
        <Mail className="h-4 w-4 shrink-0" /> You're connected! Find them at {c.person.email}
      </a>
    )}
  </motion.article>
);

export default function InboxPage() {
  const { refresh } = useAuth();
  const [tab, setTab] = useState("incoming");
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/connections").then(async ({ data }) => {
      setData(data);
      const unseen = data.incoming.filter((c) => c.status === "sent");
      await Promise.all(unseen.map((c) => api.post(`/connections/${c.id}/seen`)));
      if (unseen.length) refresh();
    });
  }, [refresh]);

  const respond = async (c, accept) => {
    try {
      await api.post(`/connections/${c.id}/respond`, { accept });
      const { data } = await api.get("/connections");
      setData(data);
      if (accept) celebrate();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const list = data?.[tab] || [];
  return (
    <AppShell>
      <Eyebrow>hellos</Eyebrow>
      <h1 className="mt-2 font-hand text-5xl leading-none">Inbox</h1>
      <div className="mt-5 grid grid-cols-2 p-1 rounded-full brutal-sm bg-white" role="tablist">
        {[["incoming", "Received"], ["outgoing", "Sent"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`inbox-tab-${k}`} className="relative min-h-[44px] rounded-full font-bold text-sm">
            {tab === k && <motion.span layoutId="inbox-tab" className="absolute inset-0 rounded-full bg-[#FF5A5F]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className={`relative ${tab === k ? "text-white" : ""}`}>{l} {data ? `(${data[k].length})` : ""}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 space-y-4" data-testid={`inbox-list-${tab}`}>
        <AnimatePresence mode="popLayout">
          {list.map((c, i) => <Item key={c.id} c={c} i={i} incoming={tab === "incoming"} onRespond={respond} />)}
        </AnimatePresence>
        {data && list.length === 0 && (
          <div className="text-center py-12" data-testid="inbox-empty">
            <p className="text-5xl">📭</p>
            <p className="mt-2 font-hand text-2xl">{tab === "incoming" ? "No hellos yet" : "You haven't said hi yet"}</p>
            <Sticker color="yellow" className="mt-3">{tab === "incoming" ? "they're coming, probably" : "go on, People tab"}</Sticker>
          </div>
        )}
      </div>
    </AppShell>
  );
}
