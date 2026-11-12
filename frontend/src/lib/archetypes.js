export const ARCH_STYLE = {
  soft_landing: { bg: "bg-teal-200", chip: "bg-teal-300", emoji: "🛋️", doodle: "heart", accent: "#0D9488" },
  side_quest: { bg: "bg-amber-200", chip: "bg-amber-300", emoji: "🚀", doodle: "zig", accent: "#D97706" },
  rabbit_hole: { bg: "bg-indigo-200", chip: "bg-indigo-300", emoji: "🔎", doodle: "swirl", accent: "#4F46E5" },
  group_chat: { bg: "bg-rose-200", chip: "bg-rose-300", emoji: "💬", doodle: "burst", accent: "#E11D48" },
  multitudes: { bg: "bg-violet-200", chip: "bg-violet-300", emoji: "🌈", doodle: "star", accent: "#7C3AED" },
};
export const archStyle = (id) => ARCH_STYLE[id] || ARCH_STYLE.multitudes;
