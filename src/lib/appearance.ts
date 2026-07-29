export const THEMES = ["light", "dark", "auto"] as const;
export type Theme = (typeof THEMES)[number];

/** @deprecated use Theme */
export type Appearance = Theme;

export const FONT_SLOT_IDS = ["1", "2", "3"] as const;
export type FontSlotId = (typeof FONT_SLOT_IDS)[number];

export const SANS_LABELS = ["Inter", "Satoshi", "Manrope"] as const;
export const SERIF_LABELS = ["Airif", "Braveold", "Cita Pro"] as const;

export const LINE_WIDTHS = ["narrow", "medium", "wide"] as const;
export type LineWidth = (typeof LINE_WIDTHS)[number];

export const STORAGE_THEME = "keepr-theme";
export const STORAGE_APPEARANCE = STORAGE_THEME; // legacy alias
export const STORAGE_SANS = "keepr-font-sans";
export const STORAGE_SERIF = "keepr-font-serif";
export const STORAGE_FONT_SIZE = "keepr-font-size";
export const STORAGE_LINE_HEIGHT = "keepr-line-height";
export const STORAGE_LINE_WIDTH = "keepr-line-width";
export const STORAGE_READER_FACE = "keepr-reader-face";

export type ReaderFace = "serif" | "sans";

/** Legacy keys still read on boot */
const LEGACY_APPEARANCE = "read-later-appearance";
const LEGACY_SANS = "read-later-font-sans";
const LEGACY_SERIF = "read-later-font-serif";

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_DEFAULT = 18;
export const FONT_SIZE_STEP = 1;

export const LINE_HEIGHT_MIN = 1.2;
export const LINE_HEIGHT_MAX = 2.0;
export const LINE_HEIGHT_DEFAULT = 1.6;
export const LINE_HEIGHT_STEP = 0.1;

export const LINE_WIDTH_DEFAULT: LineWidth = "medium";

export function isTheme(v: string): v is Theme {
  return (THEMES as readonly string[]).includes(v);
}

export function isAppearance(v: string): v is Theme {
  return isTheme(v) || v === "tan" || v === "grey";
}

export function isFontSlotId(v: string): v is FontSlotId {
  return (FONT_SLOT_IDS as readonly string[]).includes(v);
}

export function isLineWidth(v: string): v is LineWidth {
  return (LINE_WIDTHS as readonly string[]).includes(v);
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "auto") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }
  return theme;
}

export function applyThemeToDocument(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.surface = resolved;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function applySansToDocument(n: FontSlotId) {
  document.documentElement.dataset.sans = n;
}

export function applySerifToDocument(n: FontSlotId) {
  document.documentElement.dataset.serif = n;
}

export function applyFontSizeToDocument(px: number) {
  document.documentElement.style.setProperty("--reader-font-size", `${px}px`);
  document.documentElement.dataset.fontSize = String(px);
}

export function applyLineHeightToDocument(lh: number) {
  const rounded = Math.round(lh * 10) / 10;
  document.documentElement.style.setProperty("--reader-line-height", String(rounded));
  document.documentElement.dataset.lineHeight = String(rounded);
}

export function applyLineWidthToDocument(w: LineWidth) {
  document.documentElement.dataset.lineWidth = w;
  const max =
    w === "narrow" ? "36rem" : w === "wide" ? "48rem" : "42rem";
  document.documentElement.style.setProperty("--reader-max-width", max);
}

export function applyReaderFaceToDocument(face: ReaderFace) {
  document.documentElement.dataset.readerFace = face;
}

export function readStoredReaderFace(): ReaderFace {
  try {
    const v = localStorage.getItem(STORAGE_READER_FACE);
    if (v === "sans" || v === "serif") return v;
  } catch {
    /* ignore */
  }
  return "serif";
}

export function persistReaderFace(face: ReaderFace) {
  try {
    localStorage.setItem(STORAGE_READER_FACE, face);
  } catch {
    /* ignore */
  }
  applyReaderFaceToDocument(face);
}

export function clampFontSize(n: number) {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));
}

export function clampLineHeight(n: number) {
  const v = Math.round(n * 10) / 10;
  return Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, v));
}

export function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_THEME) || localStorage.getItem(LEGACY_APPEARANCE);
    if (v === "light" || v === "dark" || v === "auto") return v;
    if (v === "tan" || v === "grey") return "light";
  } catch {
    /* ignore */
  }
  return "dark";
}

export function readStoredSans(): FontSlotId {
  try {
    const v = localStorage.getItem(STORAGE_SANS) || localStorage.getItem(LEGACY_SANS) || "1";
    if (isFontSlotId(v)) return v;
  } catch {
    /* ignore */
  }
  return "1";
}

export function readStoredSerif(): FontSlotId {
  try {
    const v = localStorage.getItem(STORAGE_SERIF) || localStorage.getItem(LEGACY_SERIF) || "1";
    if (isFontSlotId(v)) return v;
  } catch {
    /* ignore */
  }
  return "1";
}

export function readStoredFontSize(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_FONT_SIZE));
    if (Number.isFinite(v)) return clampFontSize(v);
  } catch {
    /* ignore */
  }
  return FONT_SIZE_DEFAULT;
}

export function readStoredLineHeight(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_LINE_HEIGHT));
    if (Number.isFinite(v)) return clampLineHeight(v);
  } catch {
    /* ignore */
  }
  return LINE_HEIGHT_DEFAULT;
}

export function readStoredLineWidth(): LineWidth {
  try {
    const v = localStorage.getItem(STORAGE_LINE_WIDTH) || LINE_WIDTH_DEFAULT;
    if (isLineWidth(v)) return v;
  } catch {
    /* ignore */
  }
  return LINE_WIDTH_DEFAULT;
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_THEME, theme);
  } catch {
    /* ignore */
  }
  applyThemeToDocument(theme);
}

export function persistSans(n: FontSlotId) {
  try {
    localStorage.setItem(STORAGE_SANS, n);
  } catch {
    /* ignore */
  }
  applySansToDocument(n);
}

export function persistSerif(n: FontSlotId) {
  try {
    localStorage.setItem(STORAGE_SERIF, n);
  } catch {
    /* ignore */
  }
  applySerifToDocument(n);
}

export function persistFontSize(px: number) {
  const v = clampFontSize(px);
  try {
    localStorage.setItem(STORAGE_FONT_SIZE, String(v));
  } catch {
    /* ignore */
  }
  applyFontSizeToDocument(v);
  return v;
}

export function persistLineHeight(lh: number) {
  const v = clampLineHeight(lh);
  try {
    localStorage.setItem(STORAGE_LINE_HEIGHT, String(v));
  } catch {
    /* ignore */
  }
  applyLineHeightToDocument(v);
  return v;
}

export function persistLineWidth(w: LineWidth) {
  try {
    localStorage.setItem(STORAGE_LINE_WIDTH, w);
  } catch {
    /* ignore */
  }
  applyLineWidthToDocument(w);
}

export function applyAllStoredPreferences() {
  applyThemeToDocument(readStoredTheme());
  applySansToDocument(readStoredSans());
  applySerifToDocument(readStoredSerif());
  applyReaderFaceToDocument(readStoredReaderFace());
  applyFontSizeToDocument(readStoredFontSize());
  applyLineHeightToDocument(readStoredLineHeight());
  applyLineWidthToDocument(readStoredLineWidth());
}

/** Inline boot script — runs before paint to avoid theme/font flash. */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var T='keepr-theme',S='keepr-font-sans',R='keepr-font-serif',RF='keepr-reader-face',FS='keepr-font-size',LH='keepr-line-height',LW='keepr-line-width';var theme=localStorage.getItem(T)||localStorage.getItem('read-later-appearance')||'dark';if(theme!=='light'&&theme!=='dark'&&theme!=='auto')theme='dark';var resolved=theme;if(theme==='auto'){resolved=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}document.documentElement.dataset.theme=theme;document.documentElement.dataset.surface=resolved;document.documentElement.classList.toggle('dark',resolved==='dark');var sans=localStorage.getItem(S)||localStorage.getItem('read-later-font-sans')||'1';if(!/^[123]$/.test(sans))sans='1';document.documentElement.dataset.sans=sans;var serif=localStorage.getItem(R)||localStorage.getItem('read-later-font-serif')||'1';if(!/^[123]$/.test(serif))serif='1';document.documentElement.dataset.serif=serif;var face=localStorage.getItem(RF)||'serif';if(face!=='sans'&&face!=='serif')face='serif';document.documentElement.dataset.readerFace=face;var fs=parseInt(localStorage.getItem(FS)||'18',10);if(!(fs>=14&&fs<=28))fs=18;document.documentElement.style.setProperty('--reader-font-size',fs+'px');document.documentElement.dataset.fontSize=String(fs);var lh=parseFloat(localStorage.getItem(LH)||'1.6');if(!(lh>=1.2&&lh<=2))lh=1.6;lh=Math.round(lh*10)/10;document.documentElement.style.setProperty('--reader-line-height',String(lh));document.documentElement.dataset.lineHeight=String(lh);var lw=localStorage.getItem(LW)||'medium';if(lw!=='narrow'&&lw!=='medium'&&lw!=='wide')lw='medium';document.documentElement.dataset.lineWidth=lw;document.documentElement.style.setProperty('--reader-max-width',lw==='narrow'?'36rem':lw==='wide'?'48rem':'42rem');}catch(e){document.documentElement.classList.add('dark');document.documentElement.dataset.surface='dark';document.documentElement.dataset.theme='dark';}})();`;
