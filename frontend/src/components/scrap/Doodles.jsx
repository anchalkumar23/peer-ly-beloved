import { motion } from "framer-motion";

const DOODLES = {
  star: "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z",
  heart: "M12 21s-7.5-4.6-9.5-9.2C1 8 3.5 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.5 0 6 3.5 4.5 7.3C19.5 16.4 12 21 12 21z",
  swirl: "M4 14c0-5 4-9 9-9 4 0 7 3 7 6.5S17 18 14 18s-5-2-5-4.5 2-4 4-4 3 1.5 3 3",
  zig: "M2 16l4-8 4 8 4-8 4 8 4-8",
  arrow: "M3 18c5-1 10-6 14-13m0 0l-6 1m6-1l1 6",
  burst: "M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M5 19l3.5-3.5M15.5 8.5L19 5",
};

export const Doodle = ({ kind = "star", className = "", color = "#1E1E24", fill = "none", delay = 0, size = 40, rotate = 0, float = true }) => (
  <motion.svg
    aria-hidden
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={`${float ? "animate-floaty" : ""} pointer-events-none ${className}`}
    style={{ "--r": `${rotate}deg` }}
    initial={{ opacity: 0, scale: 0.4 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 260, damping: 18 }}
  >
    <motion.path
      d={DOODLES[kind]}
      fill={fill}
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay: delay + 0.1, duration: 1.1, ease: "easeInOut" }}
    />
  </motion.svg>
);

export const ProgressDoodle = ({ value, label }) => {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="w-full" data-testid="journey-progress" aria-label={label} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 300 16" className="w-full h-4" preserveAspectRatio="none">
        <path d="M2 8 Q 12 2 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 122 8 T 142 8 T 162 8 T 182 8 T 202 8 T 222 8 T 242 8 T 262 8 T 282 8 T 298 8"
          fill="none" stroke="#1E1E24" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" />
        <motion.path d="M2 8 Q 12 2 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 122 8 T 142 8 T 162 8 T 182 8 T 202 8 T 222 8 T 242 8 T 262 8 T 282 8 T 298 8"
          fill="none" stroke="#FF5A5F" strokeWidth="3.5" strokeLinecap="round"
          initial={false} animate={{ pathLength: pct }} transition={{ type: "spring", stiffness: 80, damping: 20 }} />
      </svg>
    </div>
  );
};
