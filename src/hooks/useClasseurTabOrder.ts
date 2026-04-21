import { useCallback, useEffect, useState } from "react";
import type { Classeur } from "@/store/useFileSystemStore";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import type { ClasseurTab } from "@/components/classeurs/types";
import {
  classeurTabOrderStorageKey,
  MAX_CLASSEUR_TAB_ORDER_IDS,
} from "@/components/classeurs/types";

export function useClasseurTabOrder(
  userId: string | undefined,
  handleUpdateClasseurPositions: (ordered: Classeur[]) => void | Promise<void>
) {
  const [classeurTabOrderIds, setClasseurTabOrderIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      setClasseurTabOrderIds(null);
      return;
    }
    try {
      const raw = localStorage.getItem(classeurTabOrderStorageKey(userId));
      if (!raw) {
        setClasseurTabOrderIds(null);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setClasseurTabOrderIds(
        Array.isArray(parsed) && parsed.every((x) => typeof x === "string")
          ? (parsed as string[])
          : null
      );
    } catch {
      setClasseurTabOrderIds(null);
    }
  }, [userId]);

  const handleTabsReorder = useCallback(
    (newTabs: ClasseurTab[]) => {
      const uid = userId;
      if (!uid) return;
      const ids = newTabs.map((t) => t.id).slice(0, MAX_CLASSEUR_TAB_ORDER_IDS);
      try {
        localStorage.setItem(classeurTabOrderStorageKey(uid), JSON.stringify(ids));
      } catch {
        /* quota / private mode */
      }
      setClasseurTabOrderIds(ids);
      const byId = useFileSystemStore.getState().classeurs;
      const reorderedOwned = newTabs
        .filter((t) => t.kind === "owned")
        .map((t) => byId[t.id])
        .filter((c): c is Classeur => !!c);
      if (reorderedOwned.length === 0) return;
      void handleUpdateClasseurPositions(reorderedOwned);
    },
    [userId, handleUpdateClasseurPositions]
  );

  return { classeurTabOrderIds, handleTabsReorder };
}
