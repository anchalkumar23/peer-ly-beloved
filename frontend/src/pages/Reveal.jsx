import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Frame } from "@/components/scrap/Shell";
import { Btn, Logo, Sticker, Tape, Mark } from "@/components/scrap/Scrap";
import { Doodle } from "@/components/scrap/Doodles";
import { archStyle } from "@/lib/archetypes";
import { celebrate } from "@/lib/confetti";

const FAN = ["bg-teal-200", "bg-amber-200", "bg-indigo-200", "bg-rose-200"];

const Shuffle = () => (
  <div className="relative h-[420px] flex items-center justify-center" data-testid="reveal-shuffling">
    {FAN.map((c, i) => (
      <motion.div key={c} className={`absolute w-56 h-80 rounded-3xl brutal-lg ${c} grid place-items-center`}
        animate={{ rotate: [0, (i - 1.5) * 14, 0, (1.5 - i) * 10, 0], x: [0, (i - 1.5) * 40, 0, (1.5 - i) * 30, 0] }}
        transition={{ duration: 1.6, ease: "easeInOut" }}>
        <Mark className="text-7xl" />
      </motion.div>
    ))}
    <p className="absolute bottom-0 font-hand text-2xl">reading your vibes…</p>
  </div>
);

export default function Reveal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const arch = user.profile?.archetype;
  const st = archStyle(arch?.id);
  const [phase, setPhase] = useState("shuffle");
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase("card"), 1700);
    return () => clearTimeout(t);
  }, []);

  const flip = () => {
    if (flipped) return;
    setFlipped(true);
    setTimeout(() => celebrate(true), 450);
  };

  return (
    <Frame>
      <main className="px-5 pt-6 pb-12 min-h-screen flex flex-col">
        <Logo small />
        <div className="mt-6 text-center">
          <Sticker color="yellow" rotate={-3} wiggle>your Scribbld personality</Sticker>
        </div>
        <AnimatePresence mode="wait">
          {phase === "shuffle" ? (
            <motion.div key="s" exit={{ opacity: 0, scale: 0.9 }}><Shuffle /></motion.div>
          ) : (
            <motion.div key="c" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col items-center">
              <div className="flip-scene w-full max-w-[330px]">
                <motion.button type="button" onClick={flip} data-testid="reveal-flip-card" aria-label={flipped ? arch?.name : "Tap to reveal your personality"}
                  className="relative w-full h-[440px] text-left" style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                  <motion.div className="flip-face absolute inset-0 rounded-3xl brutal-lg bg-[#1E1E24] text-white grid place-items-center"
                    animate={flipped ? {} : { rotate: [-1.5, 1.5, -1.5] }} transition={{ repeat: Infinity, duration: 2.4 }}>
                    <Tape className="-top-3 left-1/2 -translate-x-1/2 -rotate-2" />
                    <div className="text-center">
                      <motion.p animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="text-8xl text-[#FF5A5F]">✳</motion.p>
                      <p className="mt-6 font-hand text-3xl">tap to flip</p>
                    </div>
                  </motion.div>
                  <div className={`flip-face absolute inset-0 rounded-3xl brutal-lg ${st.bg} p-6 flex flex-col`} style={{ transform: "rotateY(180deg)" }}>
                    <Tape className="-top-3 left-8 rotate-[-6deg]" color="tape-pink" />
                    <Doodle kind={st.doodle} className="absolute top-4 right-4" color={st.accent} size={44} />
                    <span className="text-5xl" aria-hidden>{st.emoji}</span>
                    <p className="mt-3 font-mono-x text-[11px] uppercase tracking-widest">you are</p>
                    <h1 className="font-hand text-[2.6rem] leading-[0.95]" data-testid="reveal-archetype-name">{arch?.name}</h1>
                    <p className="mt-2 text-sm font-semibold">{arch?.tagline}</p>
                    {arch?.blend?.length > 0 && <p className="mt-1 text-xs font-bold">A blend of {arch.blend.join(" + ")}</p>}
                    <p className="mt-3 text-sm leading-relaxed">{arch?.description}</p>
                  </div>
                </motion.button>
              </div>
              {flipped && (
                <>
                  <div className="mt-8 flex flex-wrap justify-center gap-2" data-testid="reveal-traits">
                    {(arch?.traits || []).map((t, i) => (
                      <motion.span key={t} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: i % 2 ? 3 : -3 }} transition={{ delay: 0.9 + i * 0.18, type: "spring", stiffness: 300, damping: 14 }}>
                        <Sticker color={["yellow", "pink", "mint"][i % 3]} rotate={0} className="text-sm py-1.5">{t}</Sticker>
                      </motion.span>
                    ))}
                  </div>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }} className="w-full mt-8 space-y-3">
                    <p className="text-xs text-center text-[#5C5C66]" data-testid="reveal-disclaimer">For fun, not an assessment. It says nothing about how you work.</p>
                    <Btn className="w-full" onClick={() => nav("/people")} data-testid="reveal-meet-people-btn">Meet my people →</Btn>
                    <Btn variant="paper" className="w-full" onClick={() => nav("/me")} data-testid="reveal-see-card-btn">See my scrapbook card</Btn>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </Frame>
  );
}
