import confetti from "canvas-confetti";

const COLORS = ["#FF5A5F", "#F59E0B", "#10B981", "#2563EB", "#EC4899", "#FDE68A"];

export const celebrate = (big = false) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({ particleCount: big ? 160 : 70, spread: big ? 100 : 70, origin: { y: 0.6 }, colors: COLORS, scalar: 1.1 });
  if (big) {
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS }), 250);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS }), 400);
  }
};
