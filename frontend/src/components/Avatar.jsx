import { motion } from "framer-motion";
import { assetUrl } from "@/lib/api";

const PALETTE = ["bg-amber-200", "bg-pink-200", "bg-emerald-200", "bg-sky-200", "bg-violet-200"];

export const Avatar = ({ name = "?", url, size = 64, tilt = -3, className = "", testid }) => {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const color = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];
  return (
    <motion.div
      data-testid={testid}
      className={`relative shrink-0 bg-white p-1 pb-2.5 brutal-sm rounded-md ${className}`}
      style={{ width: size, rotate: tilt }}
      whileHover={{ rotate: 0, scale: 1.04 }}
    >
      {url ? (
        <img src={assetUrl(url)} alt={`${name}'s photo`} className="w-full aspect-square object-cover rounded-sm" loading="lazy" />
      ) : (
        <div className={`w-full aspect-square grid place-items-center rounded-sm font-hand ${color}`} style={{ fontSize: size * 0.38 }}>{initials}</div>
      )}
    </motion.div>
  );
};
