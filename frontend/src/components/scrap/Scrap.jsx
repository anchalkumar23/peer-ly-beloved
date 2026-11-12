import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export const Mark = ({ className = "", spin = false }) => (
  <span aria-hidden className={`inline-block text-[#FF5A5F] ${spin ? "animate-spin-slow" : ""} ${className}`}>✳</span>
);

export const Logo = ({ small }) => (
  <div className="flex items-center gap-1.5" data-testid="app-logo">
    <Mark spin className={small ? "text-xl" : "text-2xl"} />
    <span className={`font-hand ${small ? "text-xl" : "text-2xl"} leading-none`}>peer-ly beloved</span>
  </div>
);

export const Tape = ({ className = "", color = "", style }) => (
  <span aria-hidden className={`tape ${color} ${className}`} style={style} />
);

const STICKER_COLORS = {
  yellow: "bg-amber-300", pink: "bg-pink-300", mint: "bg-emerald-300", blue: "bg-sky-300",
  coral: "bg-[#FF5A5F] text-white", purple: "bg-violet-300", white: "bg-white",
};

export const Sticker = ({ children, color = "yellow", rotate = -2, className = "", wiggle = false, ...rest }) => (
  <motion.span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold brutal-sm text-[#1E1E24] ${STICKER_COLORS[color]} ${className}`}
    style={{ rotate }}
    animate={wiggle ? { rotate: [rotate - 3, rotate + 3, rotate - 3] } : undefined}
    transition={wiggle ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : undefined}
    {...rest}
  >
    {children}
  </motion.span>
);

const BTN = {
  primary: "bg-[#FF5A5F] text-white hover:bg-[#E0484D]",
  ink: "bg-[#1E1E24] text-white hover:bg-black",
  paper: "bg-white text-[#1E1E24] hover:bg-amber-50",
  yellow: "bg-amber-300 text-[#1E1E24] hover:bg-amber-400",
  ghost: "bg-transparent text-[#1E1E24] border-transparent shadow-none hover:bg-black/5",
};

export const Btn = ({ variant = "primary", children, className = "", loading, disabled, size = "md", ...rest }) => (
  <motion.button
    whileHover={disabled ? undefined : { y: -2, x: -1 }}
    whileTap={disabled ? undefined : { scale: 0.96, y: 1 }}
    transition={{ type: "spring", stiffness: 500, damping: 25 }}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors
      ${size === "sm" ? "min-h-[40px] px-4 text-sm" : "min-h-[52px] px-6 text-base"}
      ${variant === "ghost" ? "" : "brutal"} ${BTN[variant]}
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...rest}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </motion.button>
);

export const Card = ({ children, className = "", tilt = 0, ...rest }) => (
  <motion.div className={`relative bg-white rounded-2xl brutal p-5 ${className}`} style={{ rotate: tilt }} {...rest}>
    {children}
  </motion.div>
);

export const Eyebrow = ({ children, className = "" }) => (
  <p className={`font-mono-x text-[11px] uppercase tracking-[0.2em] text-[#5C5C66] ${className}`}>{children}</p>
);

export const Splash = () => (
  <div className="min-h-screen paper-bg flex flex-col items-center justify-center gap-3" data-testid="splash-loader">
    <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-6xl text-[#FF5A5F]">✳</motion.div>
    <p className="font-hand text-2xl">warming up the glue stick…</p>
  </div>
);
