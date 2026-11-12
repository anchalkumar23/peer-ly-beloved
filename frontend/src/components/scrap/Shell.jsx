import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { IdCard, Users, Inbox, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "./Scrap";

export const Frame = ({ children, className = "" }) => (
  <div className="min-h-screen w-full flex justify-center">
    <div className={`relative w-full max-w-md md:max-w-2xl min-h-screen paper-bg overflow-x-hidden md:border-x-2 md:border-[#1E1E24] ${className}`}>
      {children}
    </div>
  </div>
);

export const TopBar = ({ right }) => (
  <header className="sticky top-0 z-40 bg-[#F9F6F0]/85 backdrop-blur-md border-b-2 border-[#1E1E24] px-4 h-14 flex items-center justify-between">
    <Logo small />
    {right}
  </header>
);

const TABS = [
  { to: "/me", label: "My card", icon: IdCard, id: "card" },
  { to: "/people", label: "People", icon: Users, id: "people" },
  { to: "/inbox", label: "Inbox", icon: Inbox, id: "inbox" },
  { to: "/settings", label: "Settings", icon: Settings, id: "settings" },
];

export const TabBar = () => {
  const { user } = useAuth();
  const tabs = user?.admin_role ? [...TABS, { to: "/admin", label: "Admin", icon: ShieldCheck, id: "admin" }] : TABS;
  return (
    <nav aria-label="Main" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl z-40 bg-white/95 backdrop-blur-md border-t-2 border-[#1E1E24] safe-bottom pt-2 px-2">
      <ul className="flex justify-around">
        {tabs.map(({ to, label, icon: Icon, id }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} data-testid={`tab-${id}`} className="relative flex flex-col items-center gap-0.5 py-1.5 min-h-[52px] rounded-xl">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-pill" className="absolute inset-x-2 inset-y-0 bg-amber-200 rounded-xl border-2 border-[#1E1E24]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                  <span className="relative">
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.6 : 2} />
                    {id === "inbox" && user?.unread_requests > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} data-testid="inbox-unread-badge"
                        className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5A5F] text-white text-[10px] font-bold grid place-items-center border-2 border-[#1E1E24]">
                        {user.unread_requests}
                      </motion.span>
                    )}
                  </span>
                  <span className={`relative text-[11px] ${isActive ? "font-bold" : "font-medium text-[#5C5C66]"}`}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export const AppShell = ({ children, right }) => (
  <Frame>
    <TopBar right={right} />
    <motion.main initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="px-4 pt-5 pb-32">
      {children}
    </motion.main>
    <TabBar />
  </Frame>
);

export const BottomBar = ({ children }) => (
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl z-40 bg-white/95 backdrop-blur-md border-t-2 border-[#1E1E24] px-4 pt-3 safe-bottom flex items-center gap-3">
    {children}
  </div>
);
