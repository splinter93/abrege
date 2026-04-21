import type { ClasseurItem } from "./types";

/** Clé DataTransfer pour le payload JSON des drags natifs (notes/dossiers). */
export const DRAG_JSON = "application/json";

export function getFolderIconClasses(color?: ClasseurItem["iconColor"]) {
  const base = "";
  switch (color) {
    case "orange":
      return base + "text-orange-500/80 fill-orange-500/10";
    case "blue":
      return base + "text-blue-500/80 fill-blue-500/10";
    case "emerald":
      return base + "text-emerald-500/80 fill-emerald-500/10";
    case "violet":
      return base + "text-violet-500/80 fill-violet-500/10";
    default:
      return base + "text-zinc-400 fill-zinc-500/10";
  }
}

export function getFolderIconBoxClasses(color?: ClasseurItem["iconColor"]) {
  switch (color) {
    case "orange":
      return "bg-orange-500/10 border-orange-500/20";
    case "blue":
      return "bg-blue-500/10 border-blue-500/20";
    case "emerald":
      return "bg-emerald-500/10 border-emerald-500/20";
    case "violet":
      return "bg-violet-500/10 border-violet-500/20";
    default:
      return "bg-white/[0.05] border-white/[0.1]";
  }
}
