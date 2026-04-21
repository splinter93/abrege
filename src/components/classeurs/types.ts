/** Types et constantes partagés par la page classeurs / dossiers. */

export type ItemType = "folder" | "file";

export interface ClasseurItem {
  id: string;
  type: ItemType;
  name: string;
  subtitle: string;
  iconColor?: "orange" | "blue" | "emerald" | "violet" | "neutral";
  /** For notes: used for navigation */
  slug?: string;
}

export interface ClasseurTab {
  id: string;
  name: string;
  emoji?: string;
  kind?: "owned" | "shared";
  shareId?: string;
  sharedBy?: string;
  permissionLevel?: "read" | "write";
}

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
  /** folderId pour le drop : undefined = racine du classeur, string = dossier cible */
  dropFolderId?: string | null;
}

export type ViewMode = "grid" | "list";

export interface SharedClasseurSource {
  shareId: string;
  classeurId: string;
  name: string;
  emoji?: string;
  sharedBy: string;
  permissionLevel: "read" | "write";
}

export const CLASSEUR_TAB_ORDER_STORAGE_PREFIX = "abrege:dossiers:classeurTabOrder:";
export const MAX_CLASSEUR_TAB_ORDER_IDS = 200;

export function classeurTabOrderStorageKey(userId: string): string {
  return `${CLASSEUR_TAB_ORDER_STORAGE_PREFIX}${userId}`;
}

/** Applique l’ordre persisté (localStorage) : onglets inconnus ou nouveaux restent à la fin dans l’ordre par défaut. */
export function mergeClasseurTabsOrder(
  defaultTabs: ClasseurTab[],
  orderIds: string[] | null
): ClasseurTab[] {
  if (!orderIds?.length) return defaultTabs;
  const tabById = new Map(defaultTabs.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const result: ClasseurTab[] = [];
  for (const id of orderIds.slice(0, MAX_CLASSEUR_TAB_ORDER_IDS)) {
    const t = tabById.get(id);
    if (t) {
      result.push(t);
      seen.add(id);
    }
  }
  for (const t of defaultTabs) {
    if (!seen.has(t.id)) result.push(t);
  }
  return result;
}

export function formatCreationDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const FOLDER_COLORS: Array<"orange" | "blue" | "emerald" | "violet" | "neutral"> = [
  "orange",
  "blue",
  "emerald",
  "violet",
  "neutral",
];
