import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PencilLine, LogOut, Trash2, Eye, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/scrap/Shell";
import { Btn, Eyebrow } from "@/components/scrap/Scrap";

const Row = ({ icon: Icon, title, sub, children, i }) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
    className="flex items-center gap-4 rounded-2xl bg-white brutal-sm p-4">
    <Icon className="h-6 w-6 shrink-0" />
    <div className="flex-1 min-w-0"><p className="font-bold">{title}</p><p className="text-xs text-[#5C5C66]">{sub}</p></div>
    {children}
  </motion.div>
);

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const nav = useNavigate();
  const p = user.profile;
  const [busy, setBusy] = useState(false);

  const toggle = async (fn) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const del = async () => {
    setBusy(true);
    await api.delete("/profile");
    await refresh();
    toast("Profile deleted. Fresh start whenever you like.");
    nav("/");
  };

  return (
    <AppShell>
      <Eyebrow>{user.email}</Eyebrow>
      <h1 className="mt-2 font-hand text-5xl leading-none">Settings</h1>
      <div className="mt-6 space-y-3">
        <Row i={0} icon={Eye} title="Visible to coworkers" sub={p.admin_paused ? "Paused by an admin" : "Show up in People to meet"}>
          <Switch data-testid="settings-visibility-switch" checked={!!p.discoverable} aria-label="Visible to coworkers"
            onCheckedChange={(v) => toggle(() => api.put("/profile/visibility", { discoverable: v }))} />
        </Row>
        <Row i={1} icon={ImageOff} title="Hide my photo" sub={p.has_photo ? "Coworkers see your initials instead" : "No photo uploaded"}>
          <Switch data-testid="settings-hide-photo-switch" checked={!!p.photo_hidden} disabled={!p.has_photo} aria-label="Hide my photo"
            onCheckedChange={(v) => toggle(() => api.put("/profile", { photo_hidden: v }))} />
        </Row>
        <Row i={2} icon={PencilLine} title="Edit my answers" sub="Profile, quiz, welcome note">
          <Btn size="sm" variant="yellow" onClick={() => nav("/journey?step=1")} data-testid="settings-edit-btn">Edit</Btn>
        </Row>
      </div>
      <div className="mt-10 space-y-3">
        <Btn variant="paper" className="w-full" onClick={logout} data-testid="settings-logout-btn"><LogOut className="h-4 w-4" /> Sign out</Btn>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Btn variant="ghost" className="w-full text-[#E0484D]" data-testid="settings-delete-btn"><Trash2 className="h-4 w-4" /> Delete my profile</Btn>
          </AlertDialogTrigger>
          <AlertDialogContent className="paper-bg border-2 border-[#1E1E24] rounded-2xl max-w-[92vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-hand text-3xl font-normal">Delete your profile?</AlertDialogTitle>
              <AlertDialogDescription>Your card, answers, photo link and pending hellos are removed and you'll vanish from matches. This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="settings-delete-cancel">Keep it</AlertDialogCancel>
              <AlertDialogAction data-testid="settings-delete-confirm" disabled={busy} onClick={del} className="bg-[#E0484D] hover:bg-[#c73c41]">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <p className="mt-8 text-xs text-center text-[#5C5C66]">Scribbld People is just for fun. Quiz data is never used for performance reviews.</p>
    </AppShell>
  );
}
