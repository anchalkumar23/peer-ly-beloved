import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Send, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { api, errMsg, capWords, wordCount } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Btn, Eyebrow } from "@/components/scrap/Scrap";
import { Avatar } from "@/components/Avatar";
import { celebrate } from "@/lib/confetti";

const buildOpeners = (person, note) => {
  const first = (person.display_name || "").split(" ")[0];
  const [a, b] = person.commonalities || [];
  const list = [
    `Hey ${first}! Looks like we both ${a}. Up for a coffee or a quick chat about it?`,
    `Hi ${first} 👋 Scribbld People says we both ${b || a}. Chai break this week?`,
    `Hey ${first}! Apparently we'd click. Lunch sometime so we can test the theory?`,
  ];
  if (note) list.unshift(note);
  return list.map((t) => capWords(t, 50));
};

const PaperPlane = () => (
  <div className="relative h-40" aria-hidden>
    <motion.div className="absolute left-1/2 top-1/2 text-6xl" initial={{ x: "-50%", y: "-50%", scale: 0.6, rotate: 0 }}
      animate={{ x: ["-50%", "-50%", "260%"], y: ["-50%", "-80%", "-260%"], rotate: [0, -10, -25], scale: [0.6, 1.1, 0.7], opacity: [1, 1, 0] }}
      transition={{ duration: 1.3, times: [0, 0.35, 1], ease: "easeIn" }}>✉️</motion.div>
    <motion.div className="absolute inset-0 grid place-items-center" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 14 }}>
      <span className="h-20 w-20 rounded-full bg-emerald-300 brutal grid place-items-center"><Check className="h-10 w-10" strokeWidth={3} /></span>
    </motion.div>
  </div>
);

export const SayHiSheet = ({ person, onClose, onSent }) => {
  const { user } = useAuth();
  const openers = person ? buildOpeners(person, user.profile?.welcome_note) : [];
  const [choice, setChoice] = useState(0);
  const [text, setText] = useState(null);
  const [phase, setPhase] = useState("pick");
  const [busy, setBusy] = useState(false);
  const msg = text ?? openers[choice] ?? "";

  const close = () => {
    onClose();
    setTimeout(() => { setPhase("pick"); setText(null); setChoice(0); }, 300);
  };
  const send = async () => {
    setBusy(true);
    try {
      await api.post("/connections", { recipient_id: person.id, message: msg.trim() });
      setPhase("sent");
      setTimeout(() => celebrate(), 1100);
      onSent(person.id);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Copied! Paste it wherever you two chat.");
    } catch {
      toast.error("Couldn't copy on this device");
    }
  };

  return (
    <Drawer open={!!person} onOpenChange={(o) => !o && close()} shouldScaleBackground={false}>
      <DrawerContent className="paper-bg border-2 border-[#1E1E24] max-w-md md:max-w-2xl mx-auto max-h-[92vh]" data-testid="sayhi-sheet">
        {person && (
          <div className="px-5 pb-8 pt-3 overflow-y-auto">
            <div className="flex items-center gap-3">
              <Avatar name={person.display_name} url={person.photo_url} size={56} />
              <div>
                <DrawerTitle className="font-hand text-3xl font-normal">Say hi to {person.display_name.split(" ")[0]}</DrawerTitle>
                <DrawerDescription className="text-xs">Not a chat: they get one hello and can accept or decline.</DrawerDescription>
              </div>
            </div>
            <AnimatePresence mode="wait">
              {phase === "pick" && (
                <motion.div key="pick" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-5 space-y-3">
                  <Eyebrow>pick an opener</Eyebrow>
                  {openers.map((o, i) => (
                    <motion.button key={i} type="button" data-testid={`sayhi-opener-${i}`} onClick={() => { setChoice(i); setText(null); }}
                      whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`w-full text-left rounded-2xl border-2 border-[#1E1E24] p-4 text-sm transition-colors ${choice === i && text === null ? "bg-amber-200 shadow-[2px_2px_0_#1E1E24]" : "bg-white shadow-[4px_4px_0_#1E1E24]"}`}>
                      {i === 0 && user.profile?.welcome_note && <span className="block font-mono-x text-[10px] uppercase tracking-widest mb-1">your welcome note</span>}
                      {o}
                    </motion.button>
                  ))}
                  <Btn className="w-full mt-2" onClick={() => setPhase("review")} data-testid="sayhi-review-btn">Review message →</Btn>
                </motion.div>
              )}
              {phase === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-5">
                  <Eyebrow>review & tweak</Eyebrow>
                  <textarea data-testid="sayhi-message-input" rows={5} value={msg} onChange={(e) => setText(capWords(e.target.value, 50))} aria-label="Your message"
                    className="mt-2 w-full rounded-2xl brutal lined-paper px-4 py-2 outline-none resize-none" />
                  <p className="text-right font-mono-x text-xs mt-1" data-testid="sayhi-word-count">{wordCount(msg)}/50 words</p>
                  <div className="mt-4 grid grid-cols-[52px_1fr_1fr] gap-2">
                    <Btn variant="paper" className="!px-0" aria-label="Back" onClick={() => setPhase("pick")} data-testid="sayhi-back-btn"><ArrowLeft className="h-5 w-5" /></Btn>
                    <Btn variant="paper" onClick={copy} data-testid="sayhi-copy-btn"><Copy className="h-4 w-4" /> Copy</Btn>
                    <Btn onClick={send} loading={busy} disabled={!msg.trim()} data-testid="sayhi-send-btn"><Send className="h-4 w-4" /> Send</Btn>
                  </div>
                  <p className="mt-3 text-xs text-[#5C5C66]">They'll see it in the app and get an email saying you said hi. The message itself stays in the app.</p>
                </motion.div>
              )}
              {phase === "sent" && (
                <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center" data-testid="sayhi-sent-state">
                  <PaperPlane />
                  <p className="font-hand text-3xl">Hello sent!</p>
                  <p className="text-sm text-[#5C5C66] mt-1">Track it in Inbox → Sent: Sent → Seen → Accepted.</p>
                  <Btn variant="paper" className="w-full mt-5" onClick={close} data-testid="sayhi-done-btn">Done</Btn>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
