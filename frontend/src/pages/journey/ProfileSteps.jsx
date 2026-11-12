import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Camera, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { Sticker, Eyebrow, Tape, Btn } from "@/components/scrap/Scrap";
import { Doodle } from "@/components/scrap/Doodles";
import { PhotoCropper } from "@/components/PhotoCropper";
import { Avatar } from "@/components/Avatar";

export const StepHead = ({ eyebrow, title, sub }) => (
  <div className="mb-6">
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="mt-2 font-hand text-4xl leading-[1.05]">{title}</h2>
    {sub && <p className="mt-2 text-sm text-[#5C5C66]">{sub}</p>}
  </div>
);

export const WelcomeStep = ({ name }) => (
  <div className="relative">
    <Doodle kind="burst" className="absolute -top-4 right-0" color="#FF5A5F" size={54} />
    <Sticker color="mint" rotate={-4} wiggle>✳ side quest unlocked</Sticker>
    <h1 className="mt-5 font-hand text-5xl leading-[0.95]">Hey {(name || "").split(" ")[0]}, let's make your <span className="text-[#FF5A5F]">Scribbld card</span>.</h1>
    <p className="mt-4 text-[#5C5C66]">Four tiny profile screens, 28 quick questions, one short hello. Then we reveal your personality and introduce you to people you'd click with.</p>
    <div className="mt-8 grid grid-cols-3 gap-3">
      {[["~20", "minutes", "bg-amber-200", -3], ["28", "questions", "bg-pink-200", 2], ["0", "work stuff", "bg-emerald-200", -1]].map(([n, l, c, r], i) => (
        <motion.div key={l} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1, rotate: r }} transition={{ delay: 0.2 + i * 0.12, type: "spring" }}
          className={`rounded-2xl brutal ${c} p-3 text-center`}>
          <p className="font-hand text-4xl leading-none">{n}</p>
          <p className="text-xs font-bold mt-1">{l}</p>
        </motion.div>
      ))}
    </div>
    <div className="mt-8 rounded-2xl bg-white brutal-sm p-4 text-sm relative">
      <Tape className="-top-3 left-6 -rotate-3" color="tape-pink" />
      <p><strong>Just for fun.</strong> This isn't a psychological test or a work assessment, and nothing here is used for performance reviews. Skip anything you like; we autosave as you go.</p>
    </div>
  </div>
);

export const NameStep = ({ draft, set }) => (
  <>
    <StepHead eyebrow="profile · 1 of 4" title="Name to go by" sub="This is what shows on your card." />
    <input data-testid="profile-name-input" value={draft.display_name || ""} maxLength={40} aria-label="Name to go by"
      onChange={(e) => set({ display_name: e.target.value })}
      className="w-full h-20 rounded-2xl brutal bg-white px-5 font-hand text-4xl outline-none focus:bg-amber-50" />
  </>
);

const TEAMS = ["Design", "Copy", "Strategy", "Client servicing", "Social", "Production", "Tech", "Ops", "HR", "Leadership"];

export const TeamStep = ({ draft, set }) => (
  <>
    <StepHead eyebrow="profile · 3 of 4" title="Role / team" sub="Whatever label feels right, e.g. “Designer, Brand team”." />
    <input data-testid="profile-team-input" value={draft.team || ""} maxLength={60} aria-label="Role or team"
      onChange={(e) => set({ team: e.target.value })} placeholder="Designer, Brand team"
      className="w-full h-14 rounded-2xl brutal bg-white px-5 text-lg font-semibold outline-none focus:bg-amber-50" />
    <div className="mt-5 flex flex-wrap gap-2">
      {TEAMS.map((t, i) => (
        <motion.button key={t} type="button" data-testid={`team-chip-${t.toLowerCase().replace(/\s/g, "-")}`}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.92 }}
          onClick={() => set({ team: t })}
          className={`min-h-[40px] px-4 rounded-full text-sm font-semibold brutal-sm ${draft.team === t ? "bg-[#FF5A5F] text-white" : "bg-white hover:bg-amber-50"}`}>
          {t}
        </motion.button>
      ))}
    </div>
  </>
);

const NoPaste = ({ value, onChange, testid, label, placeholder }) => {
  const block = (e) => {
    e.preventDefault();
    toast("Typing only here ✍️ it's more fun that way.");
  };
  return (
    <label className="block">
      <span className="font-bold">{label}</span>
      <textarea data-testid={testid} value={value} maxLength={160} rows={3} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} onPaste={block} onDrop={block}
        className="mt-2 w-full rounded-2xl brutal lined-paper px-4 py-2 text-base outline-none resize-none focus:bg-amber-50" />
      <span className="block text-right text-xs text-[#5C5C66]">{(value || "").length}/160</span>
    </label>
  );
};

export const FactsStep = ({ draft, set }) => (
  <>
    <StepHead eyebrow="profile · 4 of 4" title="Two tiny truths" sub="Keep it light. Please don't include anything sensitive (health, address, etc.)." />
    <div className="space-y-5">
      <NoPaste testid="profile-funfact-input" label="Tell us one fun fact about you. Maybe a pet or an unexpected skill."
        value={draft.fun_fact || ""} onChange={(v) => set({ fun_fact: v })} placeholder="I can name every Shah Rukh film by its first scene" />
      <NoPaste testid="profile-obsession-input" label="What are you obsessed with right now? A show, a food place, anything."
        value={draft.obsession || ""} onChange={(v) => set({ obsession: v })} placeholder="That new bao place in Bandra" />
    </div>
  </>
);

export const PhotoStep = ({ profile, onProfile, name }) => {
  const fileRef = useRef();
  const [src, setSrc] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => src && URL.revokeObjectURL(src), [src]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("That's not an image file");
    if (f.size > 15 * 1024 * 1024) return toast.error("That photo is huge. Try one under 15 MB");
    setSrc(URL.createObjectURL(f));
  };
  const upload = async (blob) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const { data } = await api.post("/profile/photo", fd);
      onProfile(data);
      setSrc(null);
      toast.success("Looking great (we assume)");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    const { data } = await api.delete("/profile/photo");
    onProfile(data);
  };

  return (
    <>
      <StepHead eyebrow="profile · 2 of 4" title="A photo that feels like you" sub="Silly is welcome. Only signed-in coworkers can see it." />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} data-testid="photo-file-input" />
      <AnimatePresence mode="wait">
        {src ? (
          <motion.div key="crop" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <PhotoCropper src={src} busy={busy} onCancel={() => setSrc(null)} onDone={upload} />
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <div className="relative mt-2">
              <Tape className="-top-3 left-1/2 -translate-x-1/2 rotate-2 z-30" />
              {profile?.photo_url ? (
                <Avatar name={name} url={profile.photo_url} size={220} tilt={-3} testid="photo-preview" />
              ) : (
                <motion.button type="button" onClick={() => fileRef.current.click()} whileHover={{ rotate: 0, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  data-testid="photo-upload-btn" style={{ rotate: -3 }}
                  className="w-[220px] aspect-[5/6] bg-white brutal rounded-md p-3 pb-10 flex">
                  <span className="flex-1 grid-paper rounded-sm grid place-items-center border-2 border-dashed border-[#1E1E24]/40">
                    <span className="flex flex-col items-center gap-2"><Camera className="h-10 w-10" /><span className="font-hand text-2xl">tap to add</span></span>
                  </span>
                </motion.button>
              )}
              <Doodle kind="star" className="absolute -right-8 -bottom-4" color="#F59E0B" fill="#FDE68A" size={42} />
            </div>
            {profile?.photo_url && (
              <div className="mt-6 flex gap-3">
                <Btn size="sm" variant="paper" onClick={() => fileRef.current.click()} data-testid="photo-replace-btn"><RefreshCw className="h-4 w-4" /> Replace</Btn>
                <Btn size="sm" variant="paper" onClick={remove} data-testid="photo-remove-btn"><Trash2 className="h-4 w-4" /> Remove</Btn>
              </div>
            )}
            {profile?.photo_url && <p className="mt-4 text-sm flex items-center gap-1 text-emerald-700 font-semibold"><Check className="h-4 w-4" /> Saved</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
