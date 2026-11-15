import { readonly, reactive } from "vue";

export type SiteFontFamily = "default" | "serif";
export type ReadingTheme = "default" | "lapis";
export type ContributorsDisplay = "compact" | "detailed" | "hidden";

export type SiteSettings = {
  contributorsDisplay: ContributorsDisplay;
  showOutline: boolean;
  showComments: boolean;
  fontFamily: SiteFontFamily;
  readingTheme: ReadingTheme;
};

const STORAGE_KEY = "cc-site-settings";

const defaultSettings: SiteSettings = {
  contributorsDisplay: "compact",
  showOutline: true,
  showComments: true,
  fontFamily: "default",
  readingTheme: "default",
};

const settings = reactive<SiteSettings>({ ...defaultSettings });
let loaded = false;

const isSiteFontFamily = (value: unknown): value is SiteFontFamily =>
  value === "default" || value === "serif";

const normalizeSettings = (value: unknown): Partial<SiteSettings> => {
  if (!value || typeof value !== "object") return {};

  const rawSettings = value as Partial<Record<keyof SiteSettings | "showContributors", unknown>>;
  const nextSettings: Partial<SiteSettings> = {};

  if (
    rawSettings.contributorsDisplay === "compact" ||
    rawSettings.contributorsDisplay === "detailed" ||
    rawSettings.contributorsDisplay === "hidden"
  ) {
    nextSettings.contributorsDisplay = rawSettings.contributorsDisplay;
  } else if (rawSettings.showContributors === false) {
    nextSettings.contributorsDisplay = "hidden";
  }

  if (typeof rawSettings.showOutline === "boolean") {
    nextSettings.showOutline = rawSettings.showOutline;
  }

  if (typeof rawSettings.showComments === "boolean") {
    nextSettings.showComments = rawSettings.showComments;
  }

  if (isSiteFontFamily(rawSettings.fontFamily)) {
    nextSettings.fontFamily = rawSettings.fontFamily;
  }

  if (rawSettings.readingTheme === "default" || rawSettings.readingTheme === "lapis") {
    nextSettings.readingTheme = rawSettings.readingTheme;
  }

  return nextSettings;
};

const persistSettings = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const applySiteSettings = () => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("cc-hide-contributors", settings.contributorsDisplay === "hidden");
  root.classList.toggle("cc-hide-outline", !settings.showOutline);
  root.classList.toggle("cc-hide-comments", !settings.showComments);
  root.classList.toggle("cc-font-serif", settings.fontFamily === "serif");
  root.classList.toggle("cc-reading-lapis", settings.readingTheme === "lapis");
};

const loadSiteSettings = () => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;

  try {
    const storedSettings = window.localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      Object.assign(settings, normalizeSettings(JSON.parse(storedSettings)));
    }
  } catch (error) {
    console.error("[useSiteSettings] Failed to load settings", error);
  }

  applySiteSettings();
};

export const bootstrapSiteSettings = () => {
  loadSiteSettings();
  applySiteSettings();
};

export const updateSiteSettings = <K extends keyof SiteSettings>(
  key: K,
  value: SiteSettings[K],
) => {
  settings[key] = value;
  applySiteSettings();
  persistSettings();
};

export const resetSiteSettings = () => {
  Object.assign(settings, defaultSettings);
  applySiteSettings();
  persistSettings();
};

export const useSiteSettings = () => {
  loadSiteSettings();

  return {
    settings: readonly(settings),
    updateSiteSettings,
    resetSiteSettings,
  };
};
