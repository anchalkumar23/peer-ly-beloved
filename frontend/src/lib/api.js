import axios from "axios";

export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const api = axios.create({ baseURL: `${BACKEND}/api`, withCredentials: true });
export const assetUrl = (path) => (path ? `${BACKEND}${path}` : null);
export const errMsg = (e, fallback = "Something went sideways. Try again?") => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  return fallback;
};
export const wordCount = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;
export const capWords = (t, max) => {
  const parts = (t || "").split(/(\s+)/);
  let words = 0;
  let out = "";
  for (const p of parts) {
    if (p.trim()) {
      if (words >= max) break;
      words += 1;
    }
    out += p;
  }
  return out;
};
