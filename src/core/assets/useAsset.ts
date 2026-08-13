import { useEffect } from "react";
import { useAssetStore, getIdleEntry, type AssetEntry } from "./assetStore";

export function useAsset(key: string): AssetEntry {
  const entry = useAssetStore((s) => s.entries[key]);
  const ensure = useAssetStore((s) => s.ensure);
  useEffect(() => {
    ensure(key);
  }, [ensure, key]);
  return entry ?? getIdleEntry();
}
