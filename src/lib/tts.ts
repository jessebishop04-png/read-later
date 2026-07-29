export const TTS_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
export type TtsRate = (typeof TTS_RATES)[number];

export const STORAGE_TTS_VOICE = "keepr-tts-voice";
export const STORAGE_TTS_RATE = "keepr-tts-rate";
export const STORAGE_TTS_LANG = "keepr-tts-lang";

export const TTS_RATE_DEFAULT: TtsRate = 1;

export function isTtsRate(n: number): n is TtsRate {
  return (TTS_RATES as readonly number[]).includes(n);
}

export function readStoredTtsVoice(): string | null {
  try {
    return localStorage.getItem(STORAGE_TTS_VOICE);
  } catch {
    return null;
  }
}

export function persistTtsVoice(uri: string | null) {
  try {
    if (uri) localStorage.setItem(STORAGE_TTS_VOICE, uri);
    else localStorage.removeItem(STORAGE_TTS_VOICE);
  } catch {
    /* ignore */
  }
}

export function readStoredTtsRate(): TtsRate {
  try {
    const n = Number(localStorage.getItem(STORAGE_TTS_RATE));
    if (isTtsRate(n)) return n;
  } catch {
    /* ignore */
  }
  return TTS_RATE_DEFAULT;
}

export function persistTtsRate(rate: TtsRate) {
  try {
    localStorage.setItem(STORAGE_TTS_RATE, String(rate));
  } catch {
    /* ignore */
  }
}

export function readStoredTtsLangFilter(): string | null {
  try {
    return localStorage.getItem(STORAGE_TTS_LANG);
  } catch {
    return null;
  }
}

export function persistTtsLangFilter(lang: string | null) {
  try {
    if (lang) localStorage.setItem(STORAGE_TTS_LANG, lang);
    else localStorage.removeItem(STORAGE_TTS_LANG);
  } catch {
    /* ignore */
  }
}

export type TtsChunk = {
  text: string;
  /** null = title / non-prose */
  paragraphId: number | null;
  start: number;
  end: number;
};

/** Split plain text into speakable sentence-sized chunks (no DOM offsets). */
export function chunkForSpeech(text: string): TtsChunk[] {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
  if (!cleaned) return [];

  const parts = cleaned.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) ?? [cleaned];
  const chunks: TtsChunk[] = [];

  for (const part of parts) {
    const s = part.trim();
    if (!s) continue;
    if (s.length <= 280) {
      chunks.push({ text: s, paragraphId: null, start: 0, end: s.length });
      continue;
    }
    let rest = s;
    while (rest.length > 280) {
      let cut = rest.lastIndexOf(" ", 280);
      if (cut < 120) cut = 280;
      const piece = rest.slice(0, cut).trim();
      if (piece) chunks.push({ text: piece, paragraphId: null, start: 0, end: piece.length });
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push({ text: rest, paragraphId: null, start: 0, end: rest.length });
  }

  return chunks.filter((c) => c.text);
}

/**
 * Build speakable chunks from article prose blocks (`[data-pid]`),
 * preserving paragraph ids + character offsets for highlighting.
 */
export function buildChunksFromProse(
  root: HTMLElement,
  title?: string
): TtsChunk[] {
  const chunks: TtsChunk[] = [];
  if (title?.trim()) {
    chunks.push({
      text: title.trim(),
      paragraphId: null,
      start: 0,
      end: title.trim().length,
    });
  }

  const blocks = root.querySelectorAll<HTMLElement>("[data-pid]");
  blocks.forEach((block) => {
    const pid = Number(block.getAttribute("data-pid"));
    if (!Number.isFinite(pid)) return;
    const full = block.textContent || "";
    if (!full.trim()) return;

    const parts = full.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) ?? [full];
    let searchFrom = 0;
    for (const raw of parts) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const idx = full.indexOf(trimmed, searchFrom);
      const start = idx >= 0 ? idx : searchFrom;
      const end = start + trimmed.length;
      searchFrom = end;

      if (trimmed.length <= 280) {
        chunks.push({ text: trimmed, paragraphId: pid, start, end });
        continue;
      }
      let local = 0;
      let rest = trimmed;
      while (rest.length > 280) {
        let cut = rest.lastIndexOf(" ", 280);
        if (cut < 120) cut = 280;
        const piece = rest.slice(0, cut).trim();
        if (piece) {
          const pStart = start + local;
          chunks.push({
            text: piece,
            paragraphId: pid,
            start: pStart,
            end: pStart + piece.length,
          });
          local += cut;
        }
        rest = rest.slice(cut).trim();
        local = trimmed.indexOf(rest, local);
        if (local < 0) local = trimmed.length - rest.length;
      }
      if (rest) {
        const pStart = start + (trimmed.lastIndexOf(rest));
        chunks.push({
          text: rest,
          paragraphId: pid,
          start: Math.max(start, pStart),
          end: Math.max(start, pStart) + rest.length,
        });
      }
    }
  });

  return chunks;
}

export function formatRateLabel(rate: number): string {
  return `${rate.toFixed(rate % 1 === 0 ? 0 : 2).replace(/\.?0+$/, "")}×`;
}

export type VoiceOption = {
  uri: string;
  name: string;
  lang: string;
  langKey: string;
  langLabel: string;
  localService: boolean;
  default: boolean;
};

const LANG_DISPLAY: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  nb: "Norwegian",
  nn: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  hu: "Hungarian",
  ro: "Romanian",
  el: "Greek",
  he: "Hebrew",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  uk: "Ukrainian",
  ca: "Catalan",
  gl: "Galician",
  eu: "Basque",
  ga: "Irish",
  cy: "Welsh",
  is: "Icelandic",
  sk: "Slovak",
  sl: "Slovenian",
  hr: "Croatian",
  sr: "Serbian",
  bg: "Bulgarian",
  et: "Estonian",
  lv: "Latvian",
  lt: "Lithuanian",
  ka: "Georgian",
  af: "Afrikaans",
};

export function langKeyFromCode(lang: string): string {
  return (lang || "und").toLowerCase().split(/[-_]/)[0] || "und";
}

export function languageLabel(lang: string): string {
  const key = langKeyFromCode(lang);
  if (LANG_DISPLAY[key]) return LANG_DISPLAY[key];
  try {
    const dn = new Intl.DisplayNames(undefined, { type: "language" });
    return dn.of(key) || lang;
  } catch {
    return lang || "Other";
  }
}

export function cleanVoiceName(name: string): string {
  return name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s+Online\s*\(.*\)$/i, "")
    .replace(/\s+Desktop\s*$/i, "")
    .replace(/\s*\(.*\)$/i, "")
    .trim();
}

export function voicesToOptions(voices: SpeechSynthesisVoice[]): VoiceOption[] {
  return voices
    .map((v) => {
      const langKey = langKeyFromCode(v.lang);
      return {
        uri: v.voiceURI,
        name: cleanVoiceName(v.name),
        lang: v.lang,
        langKey,
        langLabel: languageLabel(v.lang),
        localService: v.localService,
        default: v.default,
      };
    })
    .sort((a, b) => {
      const labelCmp = a.langLabel.localeCompare(b.langLabel);
      if (labelCmp !== 0) return labelCmp;
      return a.name.localeCompare(b.name);
    });
}

export type VoiceLangGroup = {
  langKey: string;
  langLabel: string;
  voices: VoiceOption[];
};

export function groupVoicesByLanguage(voices: VoiceOption[]): VoiceLangGroup[] {
  const map = new Map<string, VoiceLangGroup>();
  for (const v of voices) {
    let g = map.get(v.langKey);
    if (!g) {
      g = { langKey: v.langKey, langLabel: v.langLabel, voices: [] };
      map.set(v.langKey, g);
    }
    g.voices.push(v);
  }
  return Array.from(map.values()).sort((a, b) => a.langLabel.localeCompare(b.langLabel));
}

export function pickDefaultVoice(
  voices: SpeechSynthesisVoice[],
  preferredUri: string | null,
  preferredLangKey?: string | null
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  if (preferredUri) {
    const match = voices.find((v) => v.voiceURI === preferredUri);
    if (match) return match;
  }
  if (preferredLangKey) {
    const inLang = voices.filter((v) => langKeyFromCode(v.lang) === preferredLangKey);
    if (inLang.length) {
      return inLang.find((v) => v.localService) || inLang.find((v) => v.default) || inLang[0];
    }
  }
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("en") && v.localService) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
    voices.find((v) => v.default) ||
    voices[0] ||
    null
  );
}

/** Map boundary charIndex to word range within a chunk. */
export function wordRangeAt(text: string, charIndex: number): { start: number; end: number } {
  if (!text) return { start: 0, end: 0 };
  const i = Math.max(0, Math.min(text.length - 1, charIndex));
  let start = i;
  let end = i;
  while (start > 0 && !/\s/.test(text[start - 1]!)) start -= 1;
  while (end < text.length && !/\s/.test(text[end]!)) end += 1;
  return { start, end };
}
