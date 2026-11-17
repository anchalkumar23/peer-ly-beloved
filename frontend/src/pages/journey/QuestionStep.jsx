import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { Sticker } from "@/components/scrap/Scrap";

const SECTION_META = {
  everyday: { title: "Your everyday", color: "yellow", emoji: "☀️" },
  pop: { title: "Pop culture brain", color: "pink", emoji: "📺" },
  out: { title: "Out and about", color: "mint", emoji: "🗺️" },
  work: { title: "At work", color: "blue", emoji: "💼" },
  you: { title: "Very you", color: "purple", emoji: "✨" },
};
export { SECTION_META };

const Tick = ({ selected, multi, className = "" }) => (
  <span className={`shrink-0 h-6 w-6 grid place-items-center border-2 border-[#1E1E24] ${multi ? "!rounded-[5px]" : "rounded-full"} ${selected ? "bg-[#FF5A5F]" : "bg-white"} ${className}`}>
    <AnimatePresence>{selected && <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}><Check className="h-4 w-4 text-white" strokeWidth={3} /></motion.span>}</AnimatePresence>
  </span>
);

const Option = ({ o, selected, multi, onToggle, compact, tile, i }) => (
  <motion.button
    type="button"
    role={multi ? "checkbox" : "radio"}
    aria-checked={selected}
    data-testid={`option-${o.id}`}
    onClick={onToggle}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0, scale: selected ? 1.02 : 1, rotate: selected ? (i % 2 ? 1 : -1) : 0 }}
    whileTap={{ scale: 0.95, rotate: -1 }}
    transition={{ delay: Math.min(i * 0.035, 0.4), type: "spring", stiffness: 420, damping: 22 }}
    className={`relative text-left w-full rounded-2xl border-2 border-[#1E1E24] transition-colors overflow-hidden
      ${tile ? "flex flex-col" : `flex items-center gap-3 ${compact ? "min-h-[56px] px-3 py-2" : "min-h-[64px] px-4 py-3"}`}
      ${selected ? "bg-amber-200 shadow-[2px_2px_0_#1E1E24]" : "bg-white shadow-[4px_4px_0_#1E1E24] hover:bg-amber-50"}`}
  >
    {tile ? (
      <>
        <span className="relative block w-full aspect-[4/3] border-b-2 border-[#1E1E24] bg-amber-100 overflow-hidden grid place-items-center">
          {o.image
            ? <>
                {/* blurred copy fills the letterbox so odd-shaped memes show uncropped without empty bars */}
                <img src={o.image} alt="" aria-hidden loading="lazy" className="absolute inset-0 w-full h-full object-cover blur-lg scale-125 opacity-70" />
                <img src={o.image} alt={o.label} loading="lazy" className={`relative w-full h-full object-contain transition-transform duration-300 ${selected ? "scale-105" : ""}`} />
              </>
            : <span className="text-5xl" aria-hidden>{o.emoji}</span>}
        </span>
        <span className="flex items-center gap-2 px-2.5 py-2 flex-1">
          <span className="flex-1 text-sm font-semibold leading-snug">{o.label}</span>
          <Tick selected={selected} multi={multi} />
        </span>
      </>
    ) : (
      <>
        <span className={`${compact ? "text-xl" : "text-2xl"} shrink-0`} aria-hidden>{o.emoji}</span>
        <span className={`flex-1 font-semibold leading-snug ${compact ? "text-sm" : "text-[15px]"}`}>{o.label}</span>
        <Tick selected={selected} multi={multi} />
      </>
    )}
  </motion.button>
);

export const QuestionStep = ({ q, answer, onChange, index, total }) => {
  const sel = answer?.selected || [];
  const meta = SECTION_META[q.section];
  const tile = q.options.some((o) => o.image);
  const compact = tile || q.options.length > 8 || q.options.every((o) => o.label.length <= 16);
  const writeIn = q.options.find((o) => o.write_in && sel.includes(o.id));

  const toggle = (id) => {
    const next = q.multi ? (sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]) : [id];
    onChange({ ...answer, selected: next, skipped: false }, !q.multi && next.length === 1 && !q.options.find((o) => o.id === id)?.write_in);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Sticker color={meta.color} rotate={-2}>{meta.emoji} {meta.title}</Sticker>
        <span className="font-mono-x text-xs text-[#5C5C66]" data-testid="question-counter">Q{index}/{total}</span>
      </div>
      <h2 className="mt-4 font-hand text-[2.1rem] leading-[1.05]" data-testid="question-prompt">{q.prompt}</h2>
      <p className="mt-1 mb-5 text-sm text-[#5C5C66]">{q.multi ? "Pick as many as you like." : "Pick one."}</p>
      <div role={q.multi ? "group" : "radiogroup"} aria-label={q.prompt} className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {q.options.map((o, i) => (
          <Option key={o.id} o={o} i={i} multi={q.multi} compact={compact} tile={tile} selected={sel.includes(o.id)} onToggle={() => toggle(o.id)} />
        ))}
      </div>
      <AnimatePresence>
        {writeIn && (
          <motion.label key="wi" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="block mt-5 overflow-hidden scroll-mb-32"
            onAnimationComplete={(def) => def?.opacity === 1 && document.querySelector(`[data-testid="writein-${q.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            <span className="text-sm font-bold">Write it in</span>
            <input data-testid={`writein-${q.id}`} value={answer?.other || ""} maxLength={80} onChange={(e) => onChange({ ...answer, other: e.target.value })}
              placeholder={q.id === "area" ? "City and area, e.g. Pune, Baner" : "Tell us"}
              className="mt-2 w-full h-12 rounded-xl brutal-sm bg-white px-4 outline-none focus:bg-amber-50" />
          </motion.label>
        )}
        {q.followup && sel.length > 0 && (
          <motion.label key="fu" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="block mt-5 overflow-hidden">
            <span className="text-sm font-bold">{q.followup.prompt}</span>
            <input data-testid={`followup-${q.id}`} value={answer?.followup || ""} maxLength={q.followup.max} onChange={(e) => onChange({ ...answer, followup: e.target.value })}
              placeholder={q.followup.placeholder} className="mt-2 w-full h-12 rounded-xl brutal-sm bg-white px-4 outline-none focus:bg-amber-50" />
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
};
