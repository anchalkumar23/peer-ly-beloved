import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Splash } from "@/components/scrap/Scrap";
import Login from "@/pages/Login";
import NameConfirm from "@/pages/NameConfirm";
import Journey from "@/pages/Journey";
import Reveal from "@/pages/Reveal";
import MyCard from "@/pages/MyCard";
import People from "@/pages/People";
import InboxPage from "@/pages/Inbox";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";

const Gate = () => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) return <Splash />;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  if (user.admin_role && location.pathname === "/admin") return <Admin />;
  if (!user.name_confirmed) return <NameConfirm />;
  const done = !!user.profile?.completed_at;
  if (!done) return <Routes><Route path="/journey" element={<Journey />} /><Route path="*" element={<Navigate to="/journey" replace />} /></Routes>;
  return (
    <Routes>
      <Route path="/journey" element={<Journey />} />
      <Route path="/reveal" element={<Reveal />} />
      <Route path="/me" element={<MyCard />} />
      <Route path="/people" element={<People />} />
      <Route path="/inbox" element={<InboxPage />} />
      <Route path="/settings" element={<Settings />} />
      {user.admin_role && <Route path="/admin" element={<Admin />} />}
      <Route path="*" element={<Navigate to="/me" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <div className="App">
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <BrowserRouter>
            <Gate />
          </BrowserRouter>
        </AuthProvider>
        <Toaster position="top-center" toastOptions={{ className: "!rounded-2xl !border-2 !border-[#1E1E24] !shadow-[3px_3px_0_#1E1E24] !font-semibold" }} />
      </MotionConfig>
    </div>
  );
}
