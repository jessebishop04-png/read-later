"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  TTS_RATE_DEFAULT,
  buildChunksFromProse,
  chunkForSpeech,
  langKeyFromCode,
  pickDefaultVoice,
  persistTtsLangFilter,
  persistTtsRate,
  persistTtsVoice,
  readStoredTtsLangFilter,
  readStoredTtsRate,
  readStoredTtsVoice,
  type TtsChunk,
  type TtsRate,
  voicesToOptions,
  wordRangeAt,
  type VoiceOption,
} from "@/lib/tts";

export type TtsDocument = {
  itemId: string;
  title: string;
  text: string;
  siteName?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
};

export type TtsHighlight = {
  paragraphId: number | null;
  sentenceStart: number;
  sentenceEnd: number;
  wordStart: number | null;
  wordEnd: number | null;
};

type TtsStatus = "idle" | "playing" | "paused";

type TtsCtx = {
  document: TtsDocument | null;
  registerDocument: (doc: TtsDocument | null) => void;
  status: TtsStatus;
  visible: boolean;
  translating: boolean;
  translateError: string | null;
  rate: TtsRate;
  volume: number;
  voiceURI: string | null;
  langFilter: string | null;
  voices: VoiceOption[];
  chunkIndex: number;
  chunkCount: number;
  progress: number;
  elapsedLabel: string;
  durationLabel: string;
  currentChunk: string;
  highlight: TtsHighlight | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  stop: () => void;
  skipForward: () => void;
  skipBack: () => void;
  setRate: (rate: TtsRate) => void;
  setVolume: (v: number) => void;
  setVoiceURI: (uri: string) => void;
  setLangFilter: (langKey: string | null) => void;
  cycleRate: (dir: -1 | 1) => void;
};

const TtsContext = createContext<TtsCtx | null>(null);

function resolveChunks(doc: TtsDocument | null): TtsChunk[] {
  if (!doc) return [];
  if (typeof document !== "undefined") {
    const prose = document.querySelector(".reader-prose") as HTMLElement | null;
    if (prose?.querySelector("[data-pid]")) {
      const fromDom = buildChunksFromProse(prose, doc.title);
      if (fromDom.length) return fromDom;
    }
  }
  return chunkForSpeech([doc.title, doc.text].filter(Boolean).join(". "));
}

export function TtsProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<TtsDocument | null>(null);
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [visible, setVisible] = useState(false);
  const [rate, setRateState] = useState<TtsRate>(TTS_RATE_DEFAULT);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);
  const [langFilter, setLangFilterState] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [chunks, setChunks] = useState<TtsChunk[]>([]);
  const [highlight, setHighlight] = useState<TtsHighlight | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const statusRef = useRef(status);
  const chunkIndexRef = useRef(0);
  const chunksRef = useRef<TtsChunk[]>([]);
  const spokenRef = useRef<string[]>([]);
  const rateRef = useRef(rate);
  const volumeRef = useRef(volume);
  const voiceURIRef = useRef(voiceURI);
  const langFilterRef = useRef(langFilter);
  const docRef = useRef<TtsDocument | null>(null);
  const voicesRawRef = useRef<SpeechSynthesisVoice[]>([]);
  const speakGenRef = useRef(0);
  const translationCacheRef = useRef<Map<string, string[]>>(new Map());
  const pendingTranslateRef = useRef<Map<string, Promise<string[]>>>(new Map());
  const prefetchGenRef = useRef(0);
  const langSpeakGenRef = useRef(0);

  statusRef.current = status;
  chunkIndexRef.current = chunkIndex;
  chunksRef.current = chunks;
  rateRef.current = rate;
  volumeRef.current = volume;
  voiceURIRef.current = voiceURI;
  langFilterRef.current = langFilter;
  docRef.current = doc;

  const refreshVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const list = window.speechSynthesis.getVoices();
    voicesRawRef.current = list;
    setVoices(voicesToOptions(list));
  }, []);

  useEffect(() => {
    setRateState(readStoredTtsRate());
    setVoiceURIState(readStoredTtsVoice());
    setLangFilterState(readStoredTtsLangFilter());
    refreshVoices();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    const t = window.setTimeout(refreshVoices, 250);
    return () => {
      window.clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    };
  }, [refreshVoices]);

  const cancelSpeech = useCallback(() => {
    speakGenRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const applyChunkHighlight = useCallback((chunk: TtsChunk, word: { start: number; end: number } | null) => {
    setHighlight({
      paragraphId: chunk.paragraphId,
      sentenceStart: chunk.start,
      sentenceEnd: chunk.end,
      wordStart: word ? chunk.start + word.start : null,
      wordEnd: word ? chunk.start + word.end : null,
    });
  }, []);

  const cacheKeyFor = useCallback((langKey: string, list: TtsChunk[]) => {
    const id = docRef.current?.itemId || "anon";
    const head = list[0]?.text.slice(0, 48) || "";
    const tail = list[list.length - 1]?.text.slice(0, 48) || "";
    return `${id}|${langKey}|${list.length}|${head}|${tail}`;
  }, []);

  /** Prepare spoken lines for lang — translates when not English. */
  const ensureSpoken = useCallback(
    async (
      langKey: string | null,
      opts?: { background?: boolean }
    ): Promise<boolean> => {
      const list = chunksRef.current;
      if (!list.length) return false;

      const key = (langKey || "en").toLowerCase();
      // Default: English playback uses original article text.
      if (key === "en") {
        spokenRef.current = list.map((c) => c.text);
        if (!opts?.background) setTranslateError(null);
        return true;
      }

      const cacheKey = cacheKeyFor(key, list);
      const cached = translationCacheRef.current.get(cacheKey);
      if (cached && cached.length === list.length) {
        if (langFilterRef.current === key) {
          spokenRef.current = cached;
        }
        if (!opts?.background) setTranslateError(null);
        return true;
      }

      let pending = pendingTranslateRef.current.get(cacheKey);
      if (!pending) {
        pending = (async () => {
          const res = await fetch("/api/tts/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              targetLang: key,
              texts: list.map((c) => c.text),
            }),
          });
          const data = (await res.json()) as {
            translations?: string[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error || "Translation failed");
          }
          const translations = data.translations || [];
          if (translations.length !== list.length) {
            throw new Error("Translation returned the wrong number of segments");
          }
          translationCacheRef.current.set(cacheKey, translations);
          return translations;
        })().finally(() => {
          pendingTranslateRef.current.delete(cacheKey);
        });
        pendingTranslateRef.current.set(cacheKey, pending);
      }

      if (!opts?.background) {
        setTranslating(true);
        setTranslateError(null);
      }
      try {
        const translations = await pending;
        // Apply only if this language is still the active filter.
        if (langFilterRef.current === key) {
          spokenRef.current = translations;
        }
        if (!opts?.background) setTranslateError(null);
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Translation failed";
        if (!opts?.background && langFilterRef.current === key) {
          setTranslateError(message);
          spokenRef.current = list.map((c) => c.text);
        }
        return false;
      } finally {
        if (!opts?.background) setTranslating(false);
      }
    },
    [cacheKeyFor]
  );

  /** Warm translation cache for every installed voice language. */
  const prefetchLanguages = useCallback(() => {
    const list = chunksRef.current;
    if (!list.length) return;
    const gen = ++prefetchGenRef.current;
    const keys = new Set<string>();
    for (const v of voicesRawRef.current) {
      const k = langKeyFromCode(v.lang);
      if (k && k !== "en") keys.add(k);
    }
    const stored = langFilterRef.current;
    if (stored && stored !== "en") keys.add(stored);

    void (async () => {
      // Prefer the user's current language first, then the rest.
      const ordered = [
        ...(stored && stored !== "en" ? [stored] : []),
        ...[...keys].filter((k) => k !== stored),
      ];
      // Limit parallelism so we don't stampede the translate API.
      const queue = [...ordered];
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) {
          if (prefetchGenRef.current !== gen) return;
          const k = queue.shift();
          if (!k) return;
          await ensureSpoken(k, { background: true });
        }
      });
      await Promise.all(workers);
    })();
  }, [ensureSpoken]);

  const speakFrom = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const list = chunksRef.current;
      if (!list.length || index < 0 || index >= list.length) {
        setStatus("idle");
        setChunkIndex(0);
        setHighlight(null);
        return;
      }

      cancelSpeech();
      const gen = speakGenRef.current;
      const chunk = list[index]!;
      const spoken =
        spokenRef.current[index] ||
        chunk.text;
      setChunkIndex(index);
      chunkIndexRef.current = index;
      setStatus("playing");
      setVisible(true);
      applyChunkHighlight(chunk, null);

      const utter = new SpeechSynthesisUtterance(spoken);
      utter.rate = rateRef.current;
      utter.volume = volumeRef.current;
      const voice = pickDefaultVoice(
        voicesRawRef.current,
        voiceURIRef.current,
        langFilterRef.current
      );
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else if (langFilterRef.current) {
        utter.lang = langFilterRef.current;
      }

      // Word boundaries follow the spoken (possibly translated) string.
      // Map proportionally back onto the original chunk for highlighting.
      utter.onboundary = (ev) => {
        if (speakGenRef.current !== gen) return;
        if (ev.name !== "word" && ev.name !== "sentence") return;
        const spokenRange = wordRangeAt(spoken, ev.charIndex ?? 0);
        if (!spoken.length || !chunk.text.length) {
          applyChunkHighlight(chunk, null);
          return;
        }
        const ratioStart = spokenRange.start / spoken.length;
        const ratioEnd = spokenRange.end / spoken.length;
        const origStart = Math.floor(ratioStart * chunk.text.length);
        const origEnd = Math.max(origStart + 1, Math.ceil(ratioEnd * chunk.text.length));
        const range = wordRangeAt(chunk.text, origStart);
        // Prefer mapped word; clamp to sentence.
        applyChunkHighlight(chunk, {
          start: Math.min(range.start, chunk.text.length),
          end: Math.min(Math.max(range.end, origEnd - origStart + range.start), chunk.text.length),
        });
      };

      utter.onend = () => {
        if (speakGenRef.current !== gen) return;
        const next = index + 1;
        if (next < list.length) speakFrom(next);
        else {
          setStatus("idle");
          setChunkIndex(0);
          setHighlight(null);
        }
      };
      utter.onerror = () => {
        if (speakGenRef.current !== gen) return;
        setStatus("idle");
      };

      window.speechSynthesis.speak(utter);

      if (chunk.paragraphId != null && typeof document !== "undefined") {
        const el = document.querySelector(`[data-pid="${chunk.paragraphId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [applyChunkHighlight, cancelSpeech]
  );

  const registerDocument = useCallback(
    (next: TtsDocument | null) => {
      setDoc(next);
      prefetchGenRef.current += 1;
      translationCacheRef.current.clear();
      pendingTranslateRef.current.clear();
      spokenRef.current = [];
      if (!next) {
        cancelSpeech();
        setStatus("idle");
        setVisible(false);
        setChunks([]);
        setChunkIndex(0);
        setHighlight(null);
        setTranslateError(null);
        return;
      }
      const nextChunks = resolveChunks(next);
      setChunks(nextChunks);
      chunksRef.current = nextChunks;
      spokenRef.current = nextChunks.map((c) => c.text);
      setChunkIndex(0);
      setHighlight(null);
      // Warm translations for installed languages in the background.
      queueMicrotask(() => prefetchLanguages());
    },
    [cancelSpeech, prefetchLanguages]
  );

  const start = useCallback(() => {
    void (async () => {
      const nextChunks = resolveChunks(doc);
      if (nextChunks.length) {
        setChunks(nextChunks);
        chunksRef.current = nextChunks;
      }
      if (!chunksRef.current.length) return;
      setVisible(true);
      await ensureSpoken(langFilterRef.current);
      speakFrom(chunkIndexRef.current || 0);
    })();
  }, [doc, ensureSpoken, speakFrom]);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    speakFrom(chunkIndexRef.current);
  }, [speakFrom]);

  const togglePlay = useCallback(() => {
    if (statusRef.current === "playing") pause();
    else if (statusRef.current === "paused") resume();
    else start();
  }, [pause, resume, start]);

  const stop = useCallback(() => {
    cancelSpeech();
    setStatus("idle");
    setVisible(false);
    setChunkIndex(0);
    setHighlight(null);
  }, [cancelSpeech]);

  const skipBySeconds = useCallback(
    (seconds: number) => {
      const list = chunksRef.current;
      if (!list.length) return;
      const wpm = 150 * rateRef.current;
      const wordsNeeded = Math.max(1, Math.round((Math.abs(seconds) / 60) * wpm));
      let words = 0;
      let i = chunkIndexRef.current;
      if (seconds >= 0) {
        while (i < list.length - 1 && words < wordsNeeded) {
          i += 1;
          words += list[i]!.text.split(/\s+/).length;
        }
      } else {
        while (i > 0 && words < wordsNeeded) {
          i -= 1;
          words += list[i]!.text.split(/\s+/).length;
        }
      }
      if (statusRef.current === "idle" && !visible) setVisible(true);
      speakFrom(i);
    },
    [speakFrom, visible]
  );

  const skipForward = useCallback(() => skipBySeconds(15), [skipBySeconds]);
  const skipBack = useCallback(() => skipBySeconds(-15), [skipBySeconds]);

  const setRate = useCallback(
    (next: TtsRate) => {
      setRateState(next);
      rateRef.current = next;
      persistTtsRate(next);
      if (statusRef.current === "playing") speakFrom(chunkIndexRef.current);
    },
    [speakFrom]
  );

  const setVolume = useCallback((v: number) => {
    const next = Math.min(1, Math.max(0, v));
    setVolumeState(next);
    volumeRef.current = next;
  }, []);

  const cycleRate = useCallback(
    (dir: -1 | 1) => {
      const rates = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as TtsRate[];
      const i = rates.indexOf(rateRef.current);
      const next = rates[Math.min(rates.length - 1, Math.max(0, i + dir))];
      setRate(next);
    },
    [setRate]
  );

  const setVoiceURI = useCallback(
    (uri: string) => {
      setVoiceURIState(uri);
      voiceURIRef.current = uri;
      persistTtsVoice(uri);
      const v = voicesRawRef.current.find((x) => x.voiceURI === uri);
      const key = v ? langKeyFromCode(v.lang) : langFilterRef.current;
      if (key) {
        setLangFilterState(key);
        langFilterRef.current = key;
        persistTtsLangFilter(key);
      }
      const gen = ++langSpeakGenRef.current;
      void (async () => {
        await ensureSpoken(key);
        if (langSpeakGenRef.current !== gen) return;
        setVisible(true);
        speakFrom(chunkIndexRef.current || 0);
      })();
    },
    [ensureSpoken, speakFrom]
  );

  const setLangFilter = useCallback(
    (langKey: string | null) => {
      setLangFilterState(langKey);
      langFilterRef.current = langKey;
      persistTtsLangFilter(langKey);
      if (langKey) {
        const match = voicesRawRef.current.find(
          (v) => langKeyFromCode(v.lang) === langKey
        );
        if (match) {
          setVoiceURIState(match.voiceURI);
          voiceURIRef.current = match.voiceURI;
          persistTtsVoice(match.voiceURI);
        }
      }
      const gen = ++langSpeakGenRef.current;
      void (async () => {
        await ensureSpoken(langKey);
        if (langSpeakGenRef.current !== gen) return;
        setVisible(true);
        speakFrom(chunkIndexRef.current || 0);
      })();
    },
    [ensureSpoken, speakFrom]
  );

  // When voices arrive after the article, finish warming language caches.
  useEffect(() => {
    if (!doc || !chunks.length || !voices.length) return;
    prefetchLanguages();
  }, [doc, chunks.length, voices.length, prefetchLanguages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!doc) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === "p" || e.key === "P") {
        if (e.shiftKey) {
          e.preventDefault();
          stop();
        } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          if (!visible) start();
          else togglePlay();
        }
      } else if (e.key === "ArrowRight" && visible) {
        e.preventDefault();
        skipForward();
      } else if (e.key === "ArrowLeft" && visible) {
        e.preventDefault();
        skipBack();
      } else if (e.key === "," && visible) {
        e.preventDefault();
        cycleRate(-1);
      } else if (e.key === "." && visible) {
        e.preventDefault();
        cycleRate(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, visible, start, stop, togglePlay, skipForward, skipBack, cycleRate]);

  useEffect(() => () => cancelSpeech(), [cancelSpeech]);

  const totalWords = useMemo(
    () => chunks.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0),
    [chunks]
  );
  const wordsDone = useMemo(() => {
    let n = 0;
    for (let i = 0; i < chunkIndex; i++) {
      n += chunks[i]?.text.split(/\s+/).filter(Boolean).length || 0;
    }
    return n;
  }, [chunks, chunkIndex]);

  const durationSec = Math.max(1, Math.round((totalWords / (150 * rate)) * 60));
  const elapsedSec = Math.min(
    durationSec,
    Math.round((wordsDone / Math.max(1, totalWords)) * durationSec)
  );
  const formatClock = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const progress = totalWords === 0 ? 0 : wordsDone / totalWords;

  const value = useMemo<TtsCtx>(
    () => ({
      document: doc,
      registerDocument,
      status,
      visible,
      translating,
      translateError,
      rate,
      volume,
      voiceURI,
      langFilter,
      voices,
      chunkIndex,
      chunkCount: chunks.length,
      progress,
      elapsedLabel: formatClock(elapsedSec),
      durationLabel: formatClock(durationSec),
      currentChunk: chunks[chunkIndex]?.text || "",
      highlight,
      start,
      pause,
      resume,
      togglePlay,
      stop,
      skipForward,
      skipBack,
      setRate,
      setVolume,
      setVoiceURI,
      setLangFilter,
      cycleRate,
    }),
    [
      doc,
      registerDocument,
      status,
      visible,
      translating,
      translateError,
      rate,
      volume,
      voiceURI,
      langFilter,
      voices,
      chunkIndex,
      chunks,
      progress,
      elapsedSec,
      durationSec,
      highlight,
      start,
      pause,
      resume,
      togglePlay,
      stop,
      skipForward,
      skipBack,
      setRate,
      setVolume,
      setVoiceURI,
      setLangFilter,
      cycleRate,
    ]
  );

  return <TtsContext.Provider value={value}>{children}</TtsContext.Provider>;
}

export function useTts() {
  const ctx = useContext(TtsContext);
  if (!ctx) throw new Error("useTts must be used within TtsProvider");
  return ctx;
}

export function useOptionalTts() {
  return useContext(TtsContext);
}
