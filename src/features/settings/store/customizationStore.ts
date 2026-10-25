import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { debouncedStorage } from "@/shared/utils/storage";

/**
 * Wallpaper + Liquid Glass customization.
 *
 * - The wallpaper itself lives in IndexedDB (too large for localStorage) and is
 *   synced to other windows (overlay) via BroadcastChannel.
 * - Numeric options are persisted in localStorage.
 */

export const MIN_WALLPAPER_BLUR = 0; // 0 = fully clear
export const MAX_WALLPAPER_BLUR = 40;
export const MIN_WALLPAPER_DIM = 0;
export const MAX_WALLPAPER_DIM = 80;
export const MIN_GLASS_BLUR = 0;
export const MAX_GLASS_BLUR = 60;
export const MIN_GLASS_OPACITY = 10;
export const MAX_GLASS_OPACITY = 85;

export const DEFAULT_GLASS_BLUR = 28;
export const DEFAULT_GLASS_OPACITY = 38;

export interface CustomizationState {
  backgroundImage: string | null;
  /** Blur applied to the wallpaper itself (px). 0 = clear / sharp. */
  backgroundBlur: number;
  /** Dark overlay on top of the wallpaper (%). */
  backgroundDim: number;
  /** Liquid glass look for the whole UI. */
  glassEnabled: boolean;
  /** Backdrop blur of glass surfaces (px). */
  glassBlur: number;
  /** How strongly glass surfaces are tinted (%). Lower = more see-through. */
  glassOpacity: number;

  setBackgroundImage: (image: string | null) => void;
  setBackgroundBlur: (blur: number) => void;
  setBackgroundDim: (dim: number) => void;
  setGlassEnabled: (enabled: boolean) => void;
  setGlassBlur: (blur: number) => void;
  setGlassOpacity: (opacity: number) => void;
  resetGlass: () => void;
  resetAll: () => void;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(v) ? v : min)));

const DB_NAME = "liner_customization_db";
const STORE_NAME = "wallpapers";
const BG_KEY = "active_wallpaper";

function openWallpaperDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadPersistedWallpaper(): Promise<string | null> {
  const db = await openWallpaperDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(BG_KEY);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function savePersistedWallpaper(data: string | null): Promise<void> {
  const db = await openWallpaperDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = data ? store.put(data, BG_KEY) : store.delete(BG_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const wallpaperBroadcast =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("liner_wallpaper_sync")
    : null;

if (wallpaperBroadcast) {
  wallpaperBroadcast.onmessage = (e) => {
    if (e.data?.type === "wallpaper_changed") {
      useCustomizationStore.setState({ backgroundImage: e.data.image });
    } else if (e.data?.type === "request_wallpaper") {
      const current = useCustomizationStore.getState().backgroundImage;
      if (current) {
        wallpaperBroadcast.postMessage({
          type: "wallpaper_changed",
          image: current,
        });
      }
    }
  };
}

export const useCustomizationStore = create<CustomizationState>()(
  persist(
    (set) => ({
      backgroundImage: null,
      backgroundBlur: 0,
      backgroundDim: 12,
      glassEnabled: true,
      glassBlur: DEFAULT_GLASS_BLUR,
      glassOpacity: DEFAULT_GLASS_OPACITY,

      setBackgroundImage: (image) => {
        set({ backgroundImage: image });
        void savePersistedWallpaper(image);
        wallpaperBroadcast?.postMessage({ type: "wallpaper_changed", image });
      },

      setBackgroundBlur: (blur) =>
        set({
          backgroundBlur: clamp(blur, MIN_WALLPAPER_BLUR, MAX_WALLPAPER_BLUR),
        }),

      setBackgroundDim: (dim) =>
        set({
          backgroundDim: clamp(dim, MIN_WALLPAPER_DIM, MAX_WALLPAPER_DIM),
        }),

      setGlassEnabled: (enabled) => set({ glassEnabled: enabled }),

      setGlassBlur: (blur) =>
        set({ glassBlur: clamp(blur, MIN_GLASS_BLUR, MAX_GLASS_BLUR) }),

      setGlassOpacity: (opacity) =>
        set({
          glassOpacity: clamp(opacity, MIN_GLASS_OPACITY, MAX_GLASS_OPACITY),
        }),

      resetGlass: () =>
        set({
          glassEnabled: true,
          glassBlur: DEFAULT_GLASS_BLUR,
          glassOpacity: DEFAULT_GLASS_OPACITY,
        }),

      resetAll: () => {
        void savePersistedWallpaper(null);
        wallpaperBroadcast?.postMessage({
          type: "wallpaper_changed",
          image: null,
        });
        set({
          backgroundImage: null,
          backgroundBlur: 0,
          backgroundDim: 12,
          glassEnabled: true,
          glassBlur: DEFAULT_GLASS_BLUR,
          glassOpacity: DEFAULT_GLASS_OPACITY,
        });
      },
    }),
    {
      name: "liner_customization_v2",
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) => ({
        backgroundBlur: state.backgroundBlur,
        backgroundDim: state.backgroundDim,
        glassEnabled: state.glassEnabled,
        glassBlur: state.glassBlur,
        glassOpacity: state.glassOpacity,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CustomizationState>;
        return {
          ...current,
          backgroundBlur: clamp(
            p.backgroundBlur ?? current.backgroundBlur,
            MIN_WALLPAPER_BLUR,
            MAX_WALLPAPER_BLUR,
          ),
          backgroundDim: clamp(
            p.backgroundDim ?? current.backgroundDim,
            MIN_WALLPAPER_DIM,
            MAX_WALLPAPER_DIM,
          ),
          glassEnabled: p.glassEnabled ?? current.glassEnabled,
          glassBlur: clamp(
            p.glassBlur ?? current.glassBlur,
            MIN_GLASS_BLUR,
            MAX_GLASS_BLUR,
          ),
          glassOpacity: clamp(
            p.glassOpacity ?? current.glassOpacity,
            MIN_GLASS_OPACITY,
            MAX_GLASS_OPACITY,
          ),
        };
      },
      onRehydrateStorage: () => () => {
        void loadPersistedWallpaper().then((img) => {
          if (img) useCustomizationStore.setState({ backgroundImage: img });
        });
        wallpaperBroadcast?.postMessage({ type: "request_wallpaper" });
      },
    },
  ),
);
