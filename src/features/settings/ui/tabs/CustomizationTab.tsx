import { useState, useRef, useCallback } from "react";
import { Gallery, TrashBin2 } from "@solar-icons/react";
import { Upload2Line } from "@mingcute/react";

import { useTranslation } from "@/languages";
import { Button, Slider, ToggleSwitch, useToast } from "@/shared/ui";
import { SettingBlock, SettingRow, SettingSection } from "../controls";
import {
  useCustomizationStore,
  MIN_WALLPAPER_BLUR,
  MAX_WALLPAPER_BLUR,
  MIN_WALLPAPER_DIM,
  MAX_WALLPAPER_DIM,
  MIN_GLASS_BLUR,
  MAX_GLASS_BLUR,
  MIN_GLASS_OPACITY,
  MAX_GLASS_OPACITY,
} from "../../store/customizationStore";
import { prepareWallpaper } from "../../lib/wallpaperImage";

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;
const MAX_FILE_BYTES = 30 * 1024 * 1024;

export function CustomizationTab({ searchQuery }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const backgroundImage = useCustomizationStore((s) => s.backgroundImage);
  const backgroundBlur = useCustomizationStore((s) => s.backgroundBlur);
  const backgroundDim = useCustomizationStore((s) => s.backgroundDim);
  const glassEnabled = useCustomizationStore((s) => s.glassEnabled);
  const glassBlur = useCustomizationStore((s) => s.glassBlur);
  const glassOpacity = useCustomizationStore((s) => s.glassOpacity);

  const setBackgroundImage = useCustomizationStore((s) => s.setBackgroundImage);
  const setBackgroundBlur = useCustomizationStore((s) => s.setBackgroundBlur);
  const setBackgroundDim = useCustomizationStore((s) => s.setBackgroundDim);
  const setGlassEnabled = useCustomizationStore((s) => s.setGlassEnabled);
  const setGlassBlur = useCustomizationStore((s) => s.setGlassBlur);
  const setGlassOpacity = useCustomizationStore((s) => s.setGlassOpacity);
  const resetGlass = useCustomizationStore((s) => s.resetGlass);
  const resetAll = useCustomizationStore((s) => s.resetAll);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast(t("settings.customization.invalid_file_type"), "error");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast(t("settings.customization.file_too_large"), "error");
        return;
      }
      setBusy(true);
      try {
        const dataUrl = await prepareWallpaper(file);
        if (!dataUrl) throw new Error("empty");
        setBackgroundImage(dataUrl);
        toast(t("settings.customization.applied"), "success");
      } catch {
        toast(t("settings.customization.read_error"), "error");
      } finally {
        setBusy(false);
      }
    },
    [setBackgroundImage, toast, t],
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const sliderLabel = (text: string, desc: string) => (
    <div className="flex min-w-0 max-w-[220px] flex-col gap-[2px]">
      <span className="text-text-primary text-[13px] font-[500]" style={font}>
        {text}
      </span>
      <span className="text-text-tertiary text-[11.5px]" style={font}>
        {desc}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* ── Wallpaper picked from the user's gallery ── */}
      <SettingSection>
        <SettingBlock
          title={t("settings.customization.wallpaper_title")}
          description={t("settings.customization.wallpaper_description")}
          titleKey="settings.customization.wallpaper_title"
          descKey="settings.customization.wallpaper_description"
          searchQuery={searchQuery}
        >
          {backgroundImage ? (
            <div className="flex flex-col gap-[14px]">
              <div className="relative h-[140px] w-full overflow-hidden rounded-[14px] bg-black/40">
                <img
                  src={backgroundImage}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    filter:
                      backgroundBlur > 0
                        ? `blur(${backgroundBlur / 2}px)`
                        : undefined,
                    transform: backgroundBlur > 0 ? "scale(1.08)" : undefined,
                  }}
                />
                {backgroundDim > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 bg-black"
                    style={{ opacity: backgroundDim / 100 }}
                  />
                )}
                <div className="absolute right-[8px] top-[8px] flex items-center gap-[6px]">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="!h-[30px] !gap-[5px] !px-[12px] !text-[12px]"
                  >
                    <Upload2Line size={14} />
                    {t("settings.customization.change_button")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setBackgroundImage(null);
                      toast(t("settings.customization.removed"), "info");
                    }}
                    className="!h-[30px] !w-[30px] !p-0"
                    title={t("settings.customization.remove_button")}
                    aria-label={t("settings.customization.remove_button")}
                  >
                    <TrashBin2 size={15} />
                  </Button>
                </div>
              </div>

              {/* Blur <-> clear */}
              <div className="flex items-center justify-between gap-[16px]">
                {sliderLabel(
                  t("settings.customization.wallpaper_blur"),
                  t("settings.customization.wallpaper_blur_desc"),
                )}
                <div className="w-[200px] shrink-0">
                  <Slider
                    value={backgroundBlur}
                    onChange={setBackgroundBlur}
                    min={MIN_WALLPAPER_BLUR}
                    max={MAX_WALLPAPER_BLUR}
                    unit="px"
                    ariaLabel={t("settings.customization.wallpaper_blur")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-[16px]">
                {sliderLabel(
                  t("settings.customization.wallpaper_dim"),
                  t("settings.customization.wallpaper_dim_desc"),
                )}
                <div className="w-[200px] shrink-0">
                  <Slider
                    value={backgroundDim}
                    onChange={setBackgroundDim}
                    min={MIN_WALLPAPER_DIM}
                    max={MAX_WALLPAPER_DIM}
                    unit="%"
                    ariaLabel={t("settings.customization.wallpaper_dim")}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-[8px]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBackgroundBlur(0)}
                >
                  {t("settings.customization.preset_clear")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBackgroundBlur(18)}
                >
                  {t("settings.customization.preset_soft")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBackgroundBlur(MAX_WALLPAPER_BLUR)}
                >
                  {t("settings.customization.preset_blurred")}
                </Button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-[8px] rounded-[14px] border border-dashed px-[16px] py-[28px] text-center transition-colors ${
                isDragOver
                  ? "border-text-primary bg-border-alpha-33"
                  : "border-border-tertiary hover:bg-border-alpha-14"
              }`}
            >
              <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-border-alpha-14 text-text-secondary">
                <Gallery size={22} />
              </div>
              <div className="flex flex-col gap-[2px]">
                <span
                  className="text-text-primary text-[13px] font-[500]"
                  style={font}
                >
                  {t("settings.customization.upload_title")}
                </span>
                <span className="text-text-tertiary text-[11.5px]" style={font}>
                  {t("settings.customization.upload_hint")}
                </span>
              </div>
            </div>
          )}
        </SettingBlock>
      </SettingSection>

      {/* ── Liquid glass ── */}
      <SettingSection>
        <SettingRow
          title={t("settings.customization.glass_title")}
          description={t("settings.customization.glass_description")}
          titleKey="settings.customization.glass_title"
          descKey="settings.customization.glass_description"
          searchQuery={searchQuery}
          explained
          control={
            <ToggleSwitch
              checked={glassEnabled}
              onChange={setGlassEnabled}
              ariaLabel={t("settings.customization.glass_title")}
            />
          }
        />

        <SettingBlock
          title={t("settings.customization.glass_tuning_title")}
          description={t("settings.customization.glass_tuning_description")}
          titleKey="settings.customization.glass_tuning_title"
          descKey="settings.customization.glass_tuning_description"
          searchQuery={searchQuery}
        >
          <div
            className={`flex flex-col gap-[14px] transition-opacity ${
              glassEnabled ? "" : "pointer-events-none opacity-45"
            }`}
          >
            <div className="flex items-center justify-between gap-[16px]">
              {sliderLabel(
                t("settings.customization.glass_blur"),
                t("settings.customization.glass_blur_desc"),
              )}
              <div className="w-[200px] shrink-0">
                <Slider
                  value={glassBlur}
                  onChange={setGlassBlur}
                  min={MIN_GLASS_BLUR}
                  max={MAX_GLASS_BLUR}
                  unit="px"
                  disabled={!glassEnabled}
                  ariaLabel={t("settings.customization.glass_blur")}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-[16px]">
              {sliderLabel(
                t("settings.customization.glass_opacity"),
                t("settings.customization.glass_opacity_desc"),
              )}
              <div className="w-[200px] shrink-0">
                <Slider
                  value={glassOpacity}
                  onChange={setGlassOpacity}
                  min={MIN_GLASS_OPACITY}
                  max={MAX_GLASS_OPACITY}
                  unit="%"
                  disabled={!glassEnabled}
                  ariaLabel={t("settings.customization.glass_opacity")}
                />
              </div>
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  resetGlass();
                  toast(t("settings.customization.glass_reset"), "info");
                }}
              >
                {t("settings.customization.reset_block")}
              </Button>
            </div>
          </div>
        </SettingBlock>

        <SettingRow
          title={t("settings.customization.reset_all")}
          description={t("settings.customization.reset_all_desc")}
          titleKey="settings.customization.reset_all"
          descKey="settings.customization.reset_all_desc"
          searchQuery={searchQuery}
          explained
          control={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                resetAll();
                toast(t("settings.customization.all_reset"), "info");
              }}
            >
              {t("settings.reset_defaults")}
            </Button>
          }
        />
      </SettingSection>
    </div>
  );
}
