import { memo } from "react";
import { useCustomizationStore } from "@/features/settings";

/**
 * Full-window backdrop that sits under every glass surface.
 * - user wallpaper (photo / GIF) with adjustable blur + dimming
 * - otherwise a soft aurora gradient when Liquid Glass is on, so the glass has
 *   something to refract even before a wallpaper is chosen.
 */
function WallpaperBackground() {
  const image = useCustomizationStore((s) => s.backgroundImage);
  const blur = useCustomizationStore((s) => s.backgroundBlur);
  const dim = useCustomizationStore((s) => s.backgroundDim);
  const glassEnabled = useCustomizationStore((s) => s.glassEnabled);

  if (!image) {
    if (!glassEnabled) return null;
    return (
      <div
        aria-hidden="true"
        className="lg-aurora pointer-events-none absolute inset-0 z-0"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <img
        src={image}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          // scale hides the transparent edge that blur() leaves at the borders
          transform: blur > 0 ? `scale(${1 + Math.min(blur, 40) / 200})` : undefined,
        }}
      />
      {dim > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: dim / 100 }}
        />
      )}
    </div>
  );
}

export default memo(WallpaperBackground);
