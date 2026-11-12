import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Pause, Play, Trash2, UserX, UserCheck, Eye, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/scrap/Shell";
import { Btn, Eyebrow, Sticker } from "@/components/scrap/Scrap";

const ROLE_LABEL = { full: "Full admin", hr: "HR admin", viewer: "View only" };
const fmt = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");

const Stat = ({ label, value, color, i, testid }) => (
  <motion.div initial={{ opacity: 0, y: 20, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1 : -1 }} transition={{ delay: i * 0.05 }}
    className={`rounded-2xl brutal-sm ${color} p-3`} data-testid={testid}>
    <p className="font-hand text-4xl leading-none">{value}</p>
    <p className="text-xs font-bold mt-1">{label}</p>
  </motion.div>
);

const Overview = () => {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)); }, []);
  if (!s) return <p className="py-10 text-center font-hand text-2xl">counting heads…</p>;
  const stats = [["Signed up", s.total, "bg-white"], ["Completed", s.completed, "bg-emerald-200"], ["In progress", s.in_progress, "bg-amber-200"],
    ["Not started", s.not_started, "bg-pink-200"], ["Opted in", s.opt_ins, "bg-sky-200"], ["Completion", `${s.completion_rate}%`, "bg-violet-200"],
    ["Hellos sent", s.requests_sent, "bg-white"], ["Accepted", s.requests_accepted, "bg-emerald-200"], ["Departed", s.departed, "bg-slate-200"]];
  return (
    <div data-testid="admin-overview">
      <div className="grid grid-cols-3 gap-3">{stats.map(([l, v, c], i) => <Stat key={l} label={l} value={v} color={c} i={i} testid={`admin-stat-${l.toLowerCase().replace(/\s/g, "-")}`} />)}</div>
      <h3 className="mt-8 font-hand text-3xl">Completion by team</h3>
      <p className="text-xs text-[#5C5C66]">Teams under 3 people are grouped so no one is singled out.</p>
      <div className="mt-3 space-y-3">
        {s.teams.map((t, i) => (
          <div key={t.team} className="rounded-xl bg-white brutal-sm p-3">
            <div className="flex justify-between text-sm font-bold"><span className="truncate">{t.team}</span><span>{t.completed}/{t.total} · {t.rate}%</span></div>
            <div className="mt-2 h-3 rounded-full bg-black/10 overflow-hidden border border-[#1E1E24]">
              <motion.div className="h-full bg-[#FF5A5F]" initial={{ width: 0 }} animate={{ width: `${t.rate}%` }} transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 60 }} />
            </div>
          </div>
        ))}
        {s.teams.length === 0 && <p className="text-sm text-[#5C5C66]">No one yet.</p>}
      </div>
    </div>
  );
};

const ProfileDialog = ({ uid, onClose }) => {
  const [p, setP] = useState(null);
  useEffect(() => { if (uid) api.get(`/admin/people/${uid}/profile`).then((r) => setP(r.data)).catch((e) => { toast.error(errMsg(e)); onClose(); }); else setP(null); }, [uid, onClose]);
  return (
    <Dialog open={!!uid} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="paper-bg border-2 border-[#1E1E24] rounded-2xl max-w-[94vw] sm:max-w-lg max-h-[85vh] overflow-y-auto" data-testid="admin-profile-dialog">
        <DialogTitle className="font-hand text-3xl font-normal">{p?.display_name || "Loading…"}</DialogTitle>
        <DialogDescription>Viewing an individual profile is logged in the audit trail.</DialogDescription>
        {p && (
          <div className="space-y-3 text-sm">
            <p><strong>{p.email}</strong> · {p.team} · {p.archetype_full?.name}</p>
            <p><strong>Fun fact:</strong> {p.fun_fact}</p>
            <p><strong>Obsession:</strong> {p.obsession}</p>
            <p><strong>Welcome note:</strong> {p.welcome_note}</p>
            <p><strong>Consent:</strong> {fmt(p.consent_at)}</p>
            <ol className="space-y-1 list-decimal pl-5">{p.answers.map((a) => <li key={a.order}><span className="text-[#5C5C66]">{a.prompt}</span> — {a.skipped ? "skipped" : [...a.answer, a.other].filter(Boolean).join(", ")}</li>)}</ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const People = ({ role }) => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [view, setView] = useState(null);
  const canEdit = role === "hr" || role === "full";
  const load = useCallback(() => api.get(`/admin/people?q=${encodeURIComponent(q)}`).then((r) => setRows(r.data)), [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const closeView = useCallback(() => setView(null), []);
  return (
    <div data-testid="admin-people">
      <label className="relative block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" />
        <input data-testid="admin-people-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search people"
          className="w-full h-12 rounded-full brutal-sm bg-white pl-10 pr-4 outline-none focus:bg-amber-50" />
      </label>
      <div className="mt-4 space-y-3">
        {rows?.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className={`rounded-2xl brutal-sm p-3 ${r.status === "departed" ? "bg-slate-100" : "bg-white"}`} data-testid={`admin-person-${r.id}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold truncate">{r.display_name || "—"} {r.admin_role && <span className="text-[10px] font-mono-x uppercase">· {ROLE_LABEL[r.admin_role]}</span>}</p>
                <p className="text-xs text-[#5C5C66] truncate">{r.email}{r.team ? ` · ${r.team}` : ""}</p>
              </div>
              <Sticker color={r.status === "departed" ? "white" : r.progress === "completed" ? "mint" : r.progress === "in_progress" ? "yellow" : "pink"} rotate={0} className="shrink-0">
                {r.status === "departed" ? "departed" : r.progress === "in_progress" ? `${r.progress_pct}%` : r.progress.replace("_", " ")}
              </Sticker>
            </div>
            <p className="mt-2 text-[11px] text-[#5C5C66]">Visible: {r.discoverable ? "yes" : "no"}{r.paused ? " (paused)" : ""} · Consent: {fmt(r.consent_at)} · Last seen: {fmt(r.last_seen)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canEdit && (r.status === "active"
                ? <Btn size="sm" variant="paper" onClick={() => act(() => api.put(`/admin/people/${r.id}/status`, { status: "departed" }), "Marked as departed")} data-testid={`admin-depart-${r.id}`}><UserX className="h-4 w-4" /> Departed</Btn>
                : <Btn size="sm" variant="paper" onClick={() => act(() => api.put(`/admin/people/${r.id}/status`, { status: "active" }), "Marked active")} data-testid={`admin-activate-${r.id}`}><UserCheck className="h-4 w-4" /> Active</Btn>)}
              {canEdit && r.progress !== "not_started" && <Btn size="sm" variant="paper" onClick={() => act(() => api.put(`/admin/people/${r.id}/pause`, { paused: !r.paused }), r.paused ? "Unpaused" : "Paused")} data-testid={`admin-pause-${r.id}`}>{r.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{r.paused ? "Unpause" : "Pause"}</Btn>}
              {canEdit && r.progress !== "not_started" && <Btn size="sm" variant="paper" onClick={() => window.confirm(`Remove ${r.display_name}'s profile?`) && act(() => api.delete(`/admin/people/${r.id}/profile`), "Profile removed")} data-testid={`admin-remove-${r.id}`}><Trash2 className="h-4 w-4" /> Remove</Btn>}
              {role === "full" && r.progress !== "not_started" && <Btn size="sm" variant="yellow" onClick={() => setView(r.id)} data-testid={`admin-view-${r.id}`}><Eye className="h-4 w-4" /> View</Btn>}
            </div>
          </motion.div>
        ))}
        {rows?.length === 0 && <p className="text-center py-8 text-sm">No one matches that search.</p>}
      </div>
      <ProfileDialog uid={view} onClose={closeView} />
    </div>
  );
};

const QuestionRow = ({ q, canEdit, onSave, onPreview }) => {
  const [prompt, setPrompt] = useState(q.prompt);
  return (
    <div className={`rounded-2xl brutal-sm p-3 ${q.active ? "bg-white" : "bg-slate-100"}`} data-testid={`admin-question-${q.id}`}>
      <div className="flex items-center gap-3">
        <span className="font-mono-x text-xs font-bold">Q{q.order}</span>
        <span className="flex-1 text-xs text-[#5C5C66]">{q.section} · {q.multi ? "multi" : "single"} · {q.options.length} options</span>
        <Switch checked={q.active} disabled={!canEdit} onCheckedChange={(v) => onSave({ active: v })} aria-label={`Question ${q.order} active`} data-testid={`admin-question-toggle-${q.id}`} />
      </div>
      <textarea rows={2} value={prompt} disabled={!canEdit} onChange={(e) => setPrompt(e.target.value)} aria-label={`Question ${q.order} wording`}
        className="mt-2 w-full rounded-xl border-2 border-[#1E1E24]/30 px-3 py-2 text-sm font-semibold bg-transparent outline-none focus:border-[#1E1E24] resize-none" data-testid={`admin-question-prompt-${q.id}`} />
      <div className="flex gap-2">
        {canEdit && prompt !== q.prompt && <Btn size="sm" onClick={() => onSave({ prompt })} data-testid={`admin-question-save-${q.id}`}>Save wording</Btn>}
        <Btn size="sm" variant="paper" onClick={() => onPreview({ ...q, prompt })} data-testid={`admin-question-preview-${q.id}`}><Smartphone className="h-4 w-4" /> Preview</Btn>
      </div>
    </div>
  );
};

const Questions = ({ role }) => {
  const [qs, setQs] = useState(null);
  const [preview, setPreview] = useState(null);
  const canEdit = role === "hr" || role === "full";
  useEffect(() => { api.get("/admin/questions").then((r) => setQs(r.data)); }, []);
  const save = async (id, patch) => {
    try {
      const { data } = await api.put(`/admin/questions/${id}`, patch);
      setQs((list) => list.map((x) => (x.id === id ? data : x)));
      toast.success("Saved");
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="space-y-3" data-testid="admin-questions">
      {!canEdit && <p className="text-sm text-[#5C5C66]">View-only access: changes are disabled.</p>}
      {qs?.map((q) => <QuestionRow key={q.id} q={q} canEdit={canEdit} onSave={(p) => save(q.id, p)} onPreview={setPreview} />)}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="bg-transparent border-0 shadow-none p-0 max-w-[340px]" data-testid="admin-question-preview-dialog">
          <DialogTitle className="sr-only">Mobile preview</DialogTitle>
          <DialogDescription className="sr-only">How this question looks on a phone</DialogDescription>
          {preview && (
            <div className="mx-auto w-[320px] h-[600px] rounded-[44px] bg-[#1E1E24] p-3 brutal-lg">
              <div className="h-full rounded-[34px] paper-bg overflow-y-auto p-4 pt-8">
                <Sticker color="yellow" rotate={-2}>{preview.section}</Sticker>
                <p className="mt-3 font-hand text-2xl leading-tight">{preview.prompt}</p>
                <p className="text-xs text-[#5C5C66] mb-3">{preview.multi ? "Pick as many as you like." : "Pick one."}</p>
                <div className="grid gap-2">{preview.options.map((o) => <div key={o.id} className="rounded-xl brutal-sm bg-white px-3 py-2 text-xs font-semibold flex gap-2"><span>{o.emoji}</span>{o.label}</div>)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Audit = () => {
  const [logs, setLogs] = useState(null);
  useEffect(() => { api.get("/admin/audit").then((r) => setLogs(r.data)); }, []);
  return (
    <ul className="space-y-2" data-testid="admin-audit">
      {logs?.map((l) => (
        <li key={l.id} className="rounded-xl bg-white brutal-sm px-3 py-2 text-xs">
          <span className="font-mono-x font-bold">{l.action}</span> · {l.target} <span className="block text-[#5C5C66]">{l.actor_email} · {fmt(l.at)}</span>
        </li>
      ))}
      {logs?.length === 0 && <p className="text-sm text-center py-8">No admin actions yet.</p>}
    </ul>
  );
};

const TABS = [["overview", "Numbers"], ["people", "People"], ["questions", "Questions"], ["audit", "Audit log"]];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const role = user.admin_role;
  return (
    <AppShell right={<Sticker color="purple" rotate={2} data-testid="admin-role-badge">{ROLE_LABEL[role]}</Sticker>}>
      <Eyebrow>admin area</Eyebrow>
      <h1 className="mt-2 font-hand text-5xl leading-none">Behind the scenes</h1>
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`admin-tab-${k}`}
            className={`shrink-0 min-h-[44px] px-4 rounded-full brutal-sm text-sm font-bold ${tab === k ? "bg-[#1E1E24] text-white" : "bg-white"}`}>{l}</button>
        ))}
      </div>
      <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
        {tab === "overview" && <Overview />}
        {tab === "people" && <People role={role} />}
        {tab === "questions" && <Questions role={role} />}
        {tab === "audit" && <Audit />}
      </motion.div>
    </AppShell>
  );
}
