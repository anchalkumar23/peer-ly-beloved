import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Frame, BottomBar } from "@/components/scrap/Shell";
import { Btn, Logo, Sticker, Eyebrow } from "@/components/scrap/Scrap";
import { Doodle } from "@/components/scrap/Doodles";

export default function NameConfirm() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.display_name || user?.ms_name || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.post("/me/name", { display_name: name.trim() });
      await refresh();
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  return (
    <Frame>
      <main className="px-5 pt-6 pb-32">
        <Logo small />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mt-12 relative">
          <Doodle kind="swirl" className="absolute -top-8 right-4" color="#2563EB" size={48} />
          <Eyebrow>signed in as {user?.email}</Eyebrow>
          <h1 className="mt-3 font-hand text-5xl leading-none">First things first.</h1>
          <p className="mt-3 text-[#5C5C66]">What should coworkers call you? We grabbed this from Microsoft, edit away.</p>
          <div className="mt-8 relative">
            <Sticker color="pink" rotate={4} className="absolute -top-3 right-3 z-10">hello, my name is</Sticker>
            <input data-testid="name-confirm-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Name to go by"
              className="w-full h-20 rounded-2xl brutal bg-white px-5 font-hand text-4xl outline-none focus:bg-amber-50" />
          </div>
          <p className="mt-2 text-xs text-[#5C5C66] text-right">{name.length}/40</p>
        </motion.div>
      </main>
      <BottomBar>
        <Btn className="w-full" disabled={!name.trim()} loading={busy} onClick={save} data-testid="name-confirm-submit">That's me →</Btn>
      </BottomBar>
    </Frame>
  );
}
