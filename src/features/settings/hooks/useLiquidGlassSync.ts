import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useCustomizationStore } from "../store/customizationStore";

/**
 * Mirrors the customization store onto <html> so the liquid glass stylesheet
 * (src/app/liquidGlass.css) can react through attributes + CSS variables.
 */
export function useLiquidGlassSync() {
  const { resolvedTheme } = useTheme();
  const glassEnabled = useCustomizationStore((s) => s.glassEnabled);
  const glassBlur = useCustomizationStore((s) => s.glassBlur);
  const glassOpacity = useCustomizationStore((s) => s.glassOpacity);
  const hasWallpaper = useCustomizationStore((s) => Boolean(s.backgroundImage));

  useEffect(() => {
    const root = document.documentElement;
    if (glassEnabled) root.setAttribute("data-liquid-glass", "on");
    else root.removeAttribute("data-liquid-glass");

    if (hasWallpaper) root.setAttribute("data-wallpaper", "on");
    else root.removeAttribute("data-wallpaper");

    root.style.setProperty("--lg-blur", `${glassBlur}px`);
    root.style.setProperty("--lg-t", String(glassOpacity));

    return () => {
      root.removeAttribute("data-liquid-glass");
      root.removeAttribute("data-wallpaper");
      root.style.removeProperty("--lg-blur");
      root.style.removeProperty("--lg-t");
    };
  }, [glassEnabled, glassBlur, glassOpacity, hasWallpaper]);

  useEffect(() => {
    const root = document.documentElement;
    const scheme =
      resolvedTheme === "light" || resolvedTheme === "dark"
        ? resolvedTheme
        : window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
          ? "dark"
          : "light";
    root.setAttribute("data-lg-scheme", scheme);
  }, [resolvedTheme]);
}
