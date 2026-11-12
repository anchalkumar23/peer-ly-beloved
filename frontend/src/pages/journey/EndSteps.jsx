import { motion } from "framer-motion";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { capWords, wordCount } from "@/lib/api";
import { Tape, Sticker } from "@/components/scrap/Scrap";
import { Avatar } from "@/components/Avatar";
import { StepHead } from "./ProfileSteps";

const EXAMPLE = "Hey! Looks like we both love ___. I'm excited we matched. Would you be up for a coffee or a quick chat about it?";

export const NoteStep = ({ draft, set, profile }) => {
  const words = wordCount(draft.welcome_note);
  const pct = Math.min(1, words / 50);
  return (
    <>
      <StepHead eyebrow="last bit · welcome note" title="Write a hello for your match"
        sub="Someone whose personality matches yours may see this note when they're invited to connect. Up to 50 words: a little about you, something you might share, or just that you'd like to meet." />
      <div className="relative">
        <Tape className="-top-3 right-8 rotate-6" color="tape-mint" />
        <textarea data-testid="welcome-note-input" rows={6} value={draft.welcome_note || ""} aria-label="Welcome note"
          onChange={(e) => set({ welcome_note: capWords(e.target.value, 50) })} placeholder={EXAMPLE}
          className="w-full rounded-2xl brutal lined-paper px-4 py-2 text-base outline-none resize-none focus:bg-amber-50" />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
          <motion.div className={`h-full ${words >= 50 ? "bg-[#FF5A5F]" : "bg-emerald-500"}`} animate={{ width: `${pct * 100}%` }} />
        </div>
        <span data-testid="welcome-note-counter" className={`font-mono-x text-xs font-bold ${words >= 50 ? "text-[#E0484D]" : ""}`}>{words}/50 words</span>
      </div>
      {!draft.welcome_note && (
        <button type="button" data-testid="welcome-note-example" onClick={() => set({ welcome_note: EXAMPLE })} className="mt-3 text-sm font-bold underline decoration-wavy decoration-[#FF5A5F] underline-offset-4">
          Start from the example
        </button>
      )}
      {draft.welcome_note && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8" data-testid="welcome-note-preview">
          <p className="font-mono-x text-[11px] uppercase tracking-widest text-[#5C5C66] mb-2">review: how your match sees it</p>
          <div className="rounded-2xl bg-white brutal-sm p-4 flex gap-3 rotate-[-0.5deg]">
            <Avatar name={draft.display_name || "You"} url={profile?.photo_url} size={48} />
            <div className="min-w-0">
              <p className="font-bold">{draft.display_name} said hi</p>
              <p className="text-sm mt-1 break-words">"{draft.welcome_note}"</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#5C5C66]">Nothing is sent automatically. You'll review every hello before it goes out.</p>
        </motion.div>
      )}
    </>
  );
};

const SEEN = ["Your name, photo and role/team", "Your fun fact and current obsession", "Your personality archetype", "Things you have in common with them"];
const HIDDEN = ["Your individual quiz answers", "Your welcome note (until you send it)", "Anything to your manager or for reviews"];

export const ConsentStep = ({ discoverable, setDiscoverable }) => (
  <>
    <StepHead eyebrow="your call" title="Want coworkers to find you?" sub="Off by default. Switch it on to appear in other people's ‘People to meet’." />
    <motion.label animate={{ backgroundColor: discoverable ? "#A7F3D0" : "#FFFFFF" }}
      className="flex items-center gap-4 rounded-2xl brutal p-4 cursor-pointer">
      {discoverable ? <Eye className="h-7 w-7" /> : <EyeOff className="h-7 w-7" />}
      <span className="flex-1">
        <span className="block font-bold text-lg">{discoverable ? "Visible to coworkers" : "Hidden for now"}</span>
        <span className="block text-sm text-[#5C5C66]">Only active, signed-in Scribbld folks.</span>
      </span>
      <Switch data-testid="consent-visibility-switch" checked={discoverable} onCheckedChange={setDiscoverable} aria-label="Visible to coworkers" />
    </motion.label>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl bg-white brutal-sm p-4">
        <Sticker color="mint" rotate={-2}>they'll see</Sticker>
        <ul className="mt-3 space-y-2 text-sm">{SEEN.map((s) => <li key={s} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />{s}</li>)}</ul>
      </div>
      <div className="rounded-2xl bg-white brutal-sm p-4">
        <Sticker color="pink" rotate={2}>they won't</Sticker>
        <ul className="mt-3 space-y-2 text-sm">{HIDDEN.map((s) => <li key={s} className="flex gap-2"><X className="h-4 w-4 mt-0.5 text-[#E0484D] shrink-0" />{s}</li>)}</ul>
      </div>
    </div>
    <p className="mt-4 text-xs text-[#5C5C66]">You can pause this or delete your profile any time in Settings.</p>
  </>
);
