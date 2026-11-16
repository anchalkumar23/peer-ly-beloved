import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg, wordCount } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Frame, BottomBar } from "@/components/scrap/Shell";
import { Btn, Logo, Splash } from "@/components/scrap/Scrap";
import { ProgressDoodle } from "@/components/scrap/Doodles";
import { WelcomeStep, NameStep, PhotoStep, TeamStep, FactsStep } from "./journey/ProfileSteps";
import { QuestionStep } from "./journey/QuestionStep";
import { NoteStep, ConsentStep } from "./journey/EndSteps";

const putRetry = async (url, body) => {
  for (let i = 0; i < 4; i += 1) {
    try {
      return await api.put(url, body);
    } catch (e) {
      if (e.response && e.response.status < 500) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw new Error("offline");
};

const variants = {
  enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0, rotate: d > 0 ? 2 : -2 }),
  center: { x: 0, opacity: 1, rotate: 0 },
  exit: (d) => ({ x: d > 0 ? -60 : 60, opacity: 0, rotate: d > 0 ? -2 : 2 }),
};

export default function Journey() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [questions, setQuestions] = useState(null);
  const [profile, setProfile] = useState(user.profile || {});
  const [draft, setDraft] = useState(() => ({ display_name: user.profile?.display_name || user.display_name, team: user.profile?.team || "", fun_fact: user.profile?.fun_fact || "", obsession: user.profile?.obsession || "", welcome_note: user.profile?.welcome_note || "" }));
  const [answers, setAnswers] = useState(user.profile?.answers || {});
  const [discoverable, setDiscoverable] = useState(!!user.profile?.discoverable);
  const [step, setStep] = useState(null);
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);
  const timers = useRef({});
  const stepRef = useRef(null);
  const [cropping, setCropping] = useState(false);
  stepRef.current = step;
  const editing = !!user.profile?.completed_at;
  const firstDraft = useRef(true);

  useEffect(() => {
    if (firstDraft.current) { firstDraft.current = false; return undefined; }
    const t = setTimeout(() => api.put("/profile", draft).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => {
    Promise.all([api.get("/questions"), refresh()]).then(([{ data }, me]) => {
      const p = me?.profile || {};
      setProfile(p);
      setAnswers(p.answers || {});
      setDiscoverable(!!p.discoverable);
      setDraft({ display_name: p.display_name || me?.display_name, team: p.team || "", fun_fact: p.fun_fact || "", obsession: p.obsession || "", welcome_note: p.welcome_note || "" });
      firstDraft.current = true;
      setQuestions(data);
      const fromQuery = parseInt(params.get("step"), 10);
      setStep(Math.min(Number.isFinite(fromQuery) ? fromQuery : p.step || 0, data.length + 6));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = useMemo(() => (questions ? ["welcome", "name", "photo", "team", "facts", ...questions.map((q) => `q:${q.id}`), "note", "consent"] : []), [questions]);
  if (!questions || step === null) return <Splash />;

  const key = steps[step];
  const q = key.startsWith("q:") ? questions.find((x) => `q:${x.id}` === key) : null;
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const saveAnswer = (qid, ans, delay = 0) => {
    clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(() => putRetry(`/profile/answers/${qid}`, ans)
      .catch(() => toast.error("That answer didn't save yet. Check your connection; we'll retry when you tap Next.", { id: "autosave" })), delay);
  };

  const go = async (to, patch = {}) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
    putRetry("/profile", { ...patch, step: to }).then(({ data }) => setProfile(data)).catch(() => {});
  };

  const onAnswer = (ans, autoAdvance) => {
    setAnswers((a) => ({ ...a, [q.id]: ans }));
    saveAnswer(q.id, ans, autoAdvance ? 0 : 450);
    const at = step;
    if (autoAdvance) setTimeout(() => stepRef.current === at && go(at + 1), 380);
  };

  const finish = async () => {
    setBusy(true);
    try {
      await api.put("/profile", { ...draft, step: steps.length - 1 });
      await api.post("/profile/complete");
      await api.put("/profile/visibility", { discoverable });
      await refresh();
      nav("/reveal", { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  const NEED = {
    name: () => draft.display_name?.trim(),
    team: () => draft.team?.trim(),
    facts: () => draft.fun_fact?.trim() && draft.obsession?.trim(),
    note: () => wordCount(draft.welcome_note) > 0,
  };
  const canNext = NEED[key] ? !!NEED[key]() : true;
  const next = () => {
    if (key === "consent") return finish();
    if (q) {
      clearTimeout(timers.current[q.id]);
      if (answers[q.id]) putRetry(`/profile/answers/${q.id}`, answers[q.id]).catch(() => toast.error("That answer didn't save. Check your connection and try again.", { id: "autosave" }));
    }
    const patch = { name: { display_name: draft.display_name }, team: { team: draft.team }, facts: { fun_fact: draft.fun_fact, obsession: draft.obsession }, note: { welcome_note: draft.welcome_note } }[key] || {};
    go(step + 1, patch);
  };
  const skip = () => {
    const ans = { selected: [], skipped: true };
    setAnswers((a) => ({ ...a, [q.id]: ans }));
    saveAnswer(q.id, ans);
    go(step + 1);
  };

  const qIndex = q ? questions.indexOf(q) + 1 : 0;
  const body = {
    welcome: <WelcomeStep name={draft.display_name} />,
    name: <NameStep draft={draft} set={set} />,
    photo: <PhotoStep profile={profile} onProfile={setProfile} name={draft.display_name} onCropping={setCropping} />,
    team: <TeamStep draft={draft} set={set} />,
    facts: <FactsStep draft={draft} set={set} />,
    note: <NoteStep draft={draft} set={set} profile={profile} />,
    consent: <ConsentStep discoverable={discoverable} setDiscoverable={setDiscoverable} />,
  }[key] || <QuestionStep q={q} answer={answers[q.id]} onChange={onAnswer} index={qIndex} total={questions.length} />;

  const nextLabel = { welcome: "Let's go →", consent: busy ? "Tallying…" : "Reveal my personality ✳", photo: profile?.photo_url ? "Next →" : "Next →" }[key] || "Next →";

  return (
    <Frame>
      <header className="sticky top-0 z-40 bg-[#F9F6F0]/90 backdrop-blur-md border-b-2 border-[#1E1E24] px-4 pt-3 pb-2">
        <div className="flex items-center justify-between h-9">
          <Logo small />
          <div className="flex items-center gap-2">
            <span className="font-mono-x text-xs text-[#5C5C66]" data-testid="journey-step-count">{step + 1}/{steps.length}</span>
            {user.admin_role && !editing && <button type="button" data-testid="journey-admin-link" onClick={() => nav("/admin")} className="h-9 px-3 rounded-full brutal-sm bg-violet-200 text-xs font-bold">Admin</button>}
            {editing && <button type="button" aria-label="Save and exit" data-testid="journey-exit-btn" onClick={async () => { await refresh(); nav("/me"); }} className="h-9 w-9 grid place-items-center rounded-full brutal-sm bg-white"><X className="h-4 w-4" /></button>}
          </div>
        </div>
        <ProgressDoodle value={(step + 1) / steps.length} label={`Step ${step + 1} of ${steps.length}`} />
      </header>
      <main className="px-5 pt-6 pb-36 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.section key={key} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 30 }} data-testid={`journey-step-${key.replace(":", "-")}`}>
            {body}
          </motion.section>
        </AnimatePresence>
      </main>
      <BottomBar>
        {key === "photo" && cropping ? (
          <p className="flex-1 text-center text-sm font-bold py-3" data-testid="journey-crop-hint">Tap “Use this” above to save your photo ☝️</p>
        ) : (<>
        {step > 0 && (
          <Btn variant="paper" className="!px-0 w-[52px] shrink-0" aria-label="Back" onClick={() => go(step - 1)} data-testid="journey-back-btn"><ArrowLeft className="h-5 w-5" /></Btn>
        )}
        {(q || (key === "photo" && !profile?.photo_url)) && (
          <Btn variant="ghost" className="shrink-0 underline decoration-wavy underline-offset-4" onClick={q ? skip : () => go(step + 1)} data-testid="journey-skip-btn">
            {q ? "Skip" : "Skip for now"}
          </Btn>
        )}
        <Btn className="flex-1" disabled={!canNext} loading={busy} onClick={next} data-testid="journey-next-btn">{nextLabel}</Btn>
        </>)}
      </BottomBar>
    </Frame>
  );
}
