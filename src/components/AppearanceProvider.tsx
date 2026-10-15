import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  APPEARANCE_STORAGE_KEY,
  BACKGROUND_INTERVAL_MS,
  MORNING_STORAGE_KEY,
  nairobiDay,
  nextBackground,
  readAppearanceIndex,
  shouldShowMorning,
} from "@/lib/appearance";
import { Button, Modal } from "@/components/ui";
import { Pause, Play, Settings, Check } from "lucide-react";
import { appearanceApi } from "@/api/appearance";
import { getStoredUser } from "@/api/client";
import sky from "@/assets/themes/sky.png.asset.json";
import noir from "@/assets/themes/noir.png.asset.json";
import lantern from "@/assets/themes/lantern.png.asset.json";
import ember from "@/assets/themes/ember.png.asset.json";
import scarlet from "@/assets/themes/scarlet.png.asset.json";
import moon from "@/assets/themes/moon.png.asset.json";

export type AppearanceTheme = { name: string; theme: string; url: string; dark: boolean };

export const backgrounds: AppearanceTheme[] = [
  { name: "Sky", theme: "sky", url: sky.url, dark: false },
  { name: "Noir Bloom", theme: "noir", url: noir.url, dark: true },
  { name: "Lantern", theme: "lantern", url: lantern.url, dark: true },
  { name: "Ember", theme: "ember", url: ember.url, dark: true },
  { name: "Scarlet", theme: "scarlet", url: scarlet.url, dark: true },
  { name: "Moonlight", theme: "moon", url: moon.url, dark: true },
];

type AppearanceContextValue = {
  index: number;
  paused: boolean;
  select: (index: number) => void;
  toggle: () => void;
  error: string;
  saving: boolean;
};

const AppearanceContext = createContext<AppearanceContextValue>({
  index: 0,
  paused: false,
  select: () => {},
  toggle: () => {},
  error: "",
  saving: false,
});

export function useAppearance() {
  return useContext(AppearanceContext);
}

export function AppearanceProvider({
  children,
  animateBackground = true,
  showMorningGreeting = true,
  showBackgroundImage = true,
}: {
  children: ReactNode;
  animateBackground?: boolean;
  showMorningGreeting?: boolean;
  showBackgroundImage?: boolean;
}) {
  const [index, setIndex] = useState(() => {
    try {
      return readAppearanceIndex(localStorage.getItem(APPEARANCE_STORAGE_KEY), backgrounds.length);
    } catch {
      return 0;
    }
  });
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMorning, setShowMorning] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.appearanceMode = backgrounds[index].dark ? "dark" : "light";
  }, [index]);

  useEffect(() => {
    try {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, String(index));
    } catch {
      /* Device storage may be unavailable. */
    }
  }, [index]);

  useEffect(() => {
    if (!showMorningGreeting) return;
    const checkDay = () => {
      try {
        if (!shouldShowMorning(localStorage.getItem(MORNING_STORAGE_KEY))) return;
        localStorage.setItem(MORNING_STORAGE_KEY, nairobiDay());
      } catch {
        /* Device storage may be unavailable. */
      }
      setShowMorning(true);
    };
    checkDay();
    const onVisible = () => {
      if (document.visibilityState === "visible") checkDay();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [showMorningGreeting]);

  // The greeting locks the page (inert) while visible, so it must always be dismissable.
  useEffect(() => {
    if (!showMorning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") setShowMorning(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMorning]);

  useEffect(() => {
    if (!animateBackground || paused || showMorning) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setIndex((value) => nextBackground(value, backgrounds.length));
    }, BACKGROUND_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [animateBackground, paused, showMorning]);

  useEffect(() => {
    document.documentElement.dataset.appearance = backgrounds[index].theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute(
      "content",
      getComputedStyle(document.documentElement).getPropertyValue("--brand").trim(),
    );
  }, [index]);

  const save = async (nextIndex: number, nextPaused: boolean) => {
    const user = getStoredUser<{ id: string }>();
    if (!user || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await appearanceApi.save(user.id, {
        theme: backgrounds[nextIndex].theme,
        paused: nextPaused,
      });
      const savedIndex = backgrounds.findIndex((background) => background.theme === result.theme);
      setIndex(savedIndex >= 0 ? savedIndex : 0);
      setPaused(result.paused);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Theme could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const select = (nextIndex: number) => {
    void save(Math.max(0, Math.min(nextIndex, backgrounds.length - 1)), true);
  };

  useEffect(() => {
    let loadedId: string | null = null;
    let active = true;
    const load = () => {
      const user = getStoredUser<{ id: string }>();
      if (!user) {
        loadedId = null;
        return;
      }
      if (loadedId === user.id) return;
      loadedId = user.id;
      void appearanceApi
        .get(user.id)
        .then((preferences) => {
          if (!active || getStoredUser<{ id: string }>()?.id !== user.id) return;
          const savedIndex = backgrounds.findIndex(
            (background) => background.theme === preferences.theme,
          );
          setIndex(savedIndex >= 0 ? savedIndex : 0);
          setPaused(preferences.paused);
        })
        .catch(() => {
          if (active) setError("Saved theme could not be loaded.");
        });
    };
    load();
    const timer = window.setInterval(load, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <AppearanceContext.Provider
      value={{
        index,
        paused,
        select,
        toggle: () => {
          void save(index, !paused);
        },
        error,
        saving,
      }}
    >
      {showBackgroundImage && (
        <div className="floral-backdrop" aria-hidden="true">
          <img
            key={backgrounds[index].theme}
            src={backgrounds[index].url}
            alt=""
            className="floral-frame is-visible"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      )}
      <div className="app-experience" inert={showMorning}>
        {children}
      </div>
      {showMorning && (
        <div
          className="morning-screen"
          role="dialog"
          aria-modal="true"
          aria-labelledby="morning-title"
        >
          <img
            src="/images/themes/morning.webp"
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="morning-brand">
            <span id="morning-title">Good morning, KHCWW</span>
            <Button type="button" autoFocus onClick={() => setShowMorning(false)}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </AppearanceContext.Provider>
  );
}

export function AppearanceControls() {
  const { index, paused, select, toggle, saving } = useAppearance();
  const [open, setOpen] = useState(false);
  return (
    <div className="appearance-controls" aria-label="Background theme">
      {backgrounds.map((background, i) => (
        <Button
          key={background.theme}
          variant="ghost"
          disabled={saving}
          className={`theme-swatch swatch-${background.theme} ${index === i ? "is-selected" : ""}`}
          aria-label={`${background.name} background`}
          aria-pressed={index === i}
          title={`${background.name} background`}
          onClick={() => select(i)}
        >
          <span />
        </Button>
      ))}
      <Button
        variant="ghost"
        className="theme-pause"
        onClick={toggle}
        aria-label={paused ? "Resume backgrounds" : "Pause backgrounds"}
        title={paused ? "Resume backgrounds" : "Pause backgrounds"}
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </Button>
      <Button
        variant="ghost"
        className="theme-pause"
        onClick={() => setOpen(true)}
        aria-label="Theme settings"
        title="Theme settings"
      >
        <Settings size={16} />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Set your theme" size="lg">
        <AppearanceSettings />
      </Modal>
    </div>
  );
}

export function AppearanceSettings() {
  const { index, paused, select, toggle, error, saving } = useAppearance();
  return (
    <div className="appearance-settings-grid">
      {backgrounds.map((background, i) => (
        <Button
          key={background.theme}
          variant="ghost"
          type="button"
          disabled={saving}
          className={`appearance-option ${index === i ? "is-selected" : ""}`}
          aria-pressed={index === i}
          onClick={() => select(i)}
        >
          <img src={background.url} alt="" loading="lazy" decoding="async" />
          <span className="appearance-option-overlay" />
          <span className="appearance-option-label">{background.name}</span>
          {index === i && (
            <span className="appearance-option-check">
              <Check size={12} /> Selected
            </span>
          )}
        </Button>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={saving}
        className="appearance-pause"
        onClick={toggle}
      >
        {paused ? <Play size={15} /> : <Pause size={15} />}{" "}
        {paused ? "Resume carousel" : "Pause carousel"}
      </Button>
      {error && (
        <p role="alert" className="appearance-pause text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
