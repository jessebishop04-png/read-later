export const APPEARANCES = ["light", "dark", "tan", "grey"] as const;
export type Appearance = (typeof APPEARANCES)[number];

export const FONT_SLOT_IDS = ["1", "2", "3"] as const;
export type FontSlotId = (typeof FONT_SLOT_IDS)[number];

export const SANS_LABELS = ["Source Sans 3", "Inter", "DM Sans"] as const;
export const SERIF_LABELS = ["Literata", "Lora", "Merriweather"] as const;

export const STORAGE_APPEARANCE = "read-later-appearance";
export const STORAGE_SANS = "read-later-font-sans";
export const STORAGE_SERIF = "read-later-font-serif";

export function isAppearance(v: string): v is Appearance {
  return (APPEARANCES as readonly string[]).includes(v);
}

export function isFontSlotId(v: string): v is FontSlotId {
  return (FONT_SLOT_IDS as readonly string[]).includes(v);
}

export function applyAppearanceToDocument(a: Appearance) {
  document.documentElement.dataset.surface = a;
  document.documentElement.classList.toggle("dark", a === "dark");
}

export function applySansToDocument(n: FontSlotId) {
  document.documentElement.dataset.sans = n;
}

export function applySerifToDocument(n: FontSlotId) {
  document.documentElement.dataset.serif = n;
}

/** Inline in root layout `<head>` or start of `<body>` — must stay in sync with keys above. */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var K='read-later-appearance',L='read-later-theme',S='read-later-font-sans',R='read-later-font-serif';var app=localStorage.getItem(K);var legacy=localStorage.getItem(L);var ok={light:1,dark:1,tan:1,grey:1};if(!app||!ok[app]){if(legacy==='dark')app='dark';else if(legacy==='light')app='light';else app=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}document.documentElement.dataset.surface=app;document.documentElement.classList.toggle('dark',app==='dark');var sans=localStorage.getItem(S)||'1';if(!/^[123]$/.test(sans))sans='1';document.documentElement.dataset.sans=sans;var serif=localStorage.getItem(R)||'1';if(!/^[123]$/.test(serif))serif='1';document.documentElement.dataset.serif=serif;}catch(e){}})();`;
