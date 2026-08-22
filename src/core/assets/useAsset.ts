import { useEffect } from "react";
import { useAssetStore, getIdleEntry, type AssetEntry } from "./assetStore";

let priorityStarted = false;

export function useAsset(key: string): AssetEntry {
  const entry = useAssetStore((s) => s.entries[key]);
  const ensure = useAssetStore((s) => s.ensure);
  useEffect(() => {
    ensure(key);
  }, [ensure, key]);

  useEffect(() => {
    if (!priorityStarted) {
      priorityStarted = true;
      const store = useAssetStore.getState();
      store.ensurePriority(5);
    }
  }, []);

  return entry ?? getIdleEntry();
}
