// components/pronounce-popup.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

type TokenPayload = { token: string; region: string };

type PronouncePopupProps = {
  open: boolean;
  onClose: () => void;
  arabic: string;
  audioUrl: string;
  language?: string;
  wordUuid: string;
  categorySlug: string;
  onScored: (score: number, wordUuid: string) => void;
};

// Timing + thresholds
const AUTO_STOP_MS = 5000;
const FINAL_GRACE_MS = 600;

const ACCEPT_SCORE = 45;   // pass if overall >= 45/100
const ACCEPT_RATIO = 0.55; // backup: char similarity >= 0.55

// NEW: auto-close behavior (without changing UI)
const AUTO_CLOSE_ON_PASS = true;
const AUTO_CLOSE_DELAY_MS = 1200;

/* ---------- helpers ---------- */
function normalizeArabic(s: string): string {
  if (!s) return "";
  return s
    .replace(/[\u064B-\u065F\u0670]/g, "") // diacritics
    .replace(/\u0640/g, "")                // tatweel
    .replace(/[^\p{L}\p{N}]+/gu, " ")      // punctuation → space
    .trim()
    .replace(/\s+/g, " ");
}
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  return dp[m][n];
}
async function getSpeechToken(): Promise<TokenPayload> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const r = await fetch(`${base}/api/azure-speech-token`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Token fetch failed: ${r.status}`);
  return r.json();
}
function charSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - dist / maxLen : 0;
}

/* ---------- component ---------- */
export default function PronouncePopup({
  open,
  onClose,
  arabic,
  audioUrl,
  language = "ar-EG",
  wordUuid,
  categorySlug,
  onScored,
}: PronouncePopupProps) {
  const [auth, setAuth] = useState<TokenPayload | null>(null);
  const [tokenErr, setTokenErr] = useState("");

  const [isRecReady, setIsRecReady] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [introAutoPlayFailed, setIntroAutoPlayFailed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  const [status, setStatus] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [warn, setWarn] = useState("");
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState<string>("");

  const playerRef = useRef<HTMLAudioElement | null>(null);
  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastFinalRef = useRef<{ text:string; json?:any; sdkResult?:sdk.SpeechRecognitionResult; ts:number } | null>(null);
  const attemptStartTsRef = useRef<number>(0);
  const introStartedRef = useRef(false);
  const scoringRef = useRef(false);

  const targetNorm = normalizeArabic(arabic);
  const toErr = (e:unknown) => typeof e === "string" ? e : (e as any)?.message || "Unexpected error";

  /* ---------- init on open ---------- */
  useEffect(() => {
    let mounted = true;
    if (open) {
      setAuth(null); setTokenErr("");
      setIsRecReady(false);
      setIsRecording(false); setIsScoring(false);
      setIsIntroPlaying(true); setIntroAutoPlayFailed(false);
      setStatus(""); setScore(null); setBestScore(null);
      setWarn(""); setError(""); setSaveMsg("");
      lastFinalRef.current = null; attemptStartTsRef.current = 0;
      introStartedRef.current = false; scoringRef.current = false;

      navigator.mediaDevices?.getUserMedia?.({ audio:true })
        .then(()=> mounted && setIsRecReady(true))
        .catch(()=> { if (mounted) { setIsRecReady(false); setWarn("Microphone is blocked or not available. Please allow mic access in your browser/OS settings."); } });

      getSpeechToken().then(t => mounted && setAuth(t)).catch(e => mounted && setTokenErr(toErr(e)));

      const startIntro = async () => {
        if (introStartedRef.current) return;
        introStartedRef.current = true;
        try {
          const audio = new Audio(audioUrl);
          playerRef.current = audio;
          let plays = 0;
          const playOnce = async () => { audio.currentTime = 0; await audio.play(); };
          audio.onended = async () => {
            plays += 1;
            if (plays < 2) { try { await playOnce(); } catch {} }
            else { audio.onended = null; if (mounted) setIsIntroPlaying(false); }
          };
          try { await playOnce(); } catch { if (mounted) { setIntroAutoPlayFailed(true); setIsIntroPlaying(false); } }
        } catch { if (mounted) setIsIntroPlaying(false); }
      };
      void startIntro();
    }
    return () => {
      mounted = false;
      try { playerRef.current?.pause?.(); playerRef.current = null; } catch {}
      cleanupRecognizer();
      if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
      introStartedRef.current = false; scoringRef.current = false; lastFinalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audioUrl, arabic]);

  const onPlaySample = () => {
    try { playerRef.current?.pause?.(); playerRef.current = new Audio(audioUrl); playerRef.current.play().catch(()=>{}); } catch {}
  };

  /* ---------- recognizer ---------- */
  function cleanupRecognizer() {
    try {
      recognizerRef.current?.stopContinuousRecognitionAsync?.(
        () => recognizerRef.current?.close?.(),
        () => recognizerRef.current?.close?.()
      );
    } catch {}
    recognizerRef.current = null;
  }

  function startRecognizer() {
    if (!auth) return;
    cleanupRecognizer();
    lastFinalRef.current = null;

    const audioCfg = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const speechCfg = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
    speechCfg.speechRecognitionLanguage = language;
    speechCfg.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000");
    speechCfg.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "2000");
    speechCfg.setProperty(sdk.PropertyId.SpeechServiceResponse_StablePartialResultThreshold, "3");

    const rec = new sdk.SpeechRecognizer(speechCfg, audioCfg);

    const paCfg = new sdk.PronunciationAssessmentConfig(
      arabic,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word, // forgiving
      true
    );
    paCfg.applyTo(rec);

    rec.recognized = (_s, e) => {
      if (e?.result?.reason !== sdk.ResultReason.RecognizedSpeech) return;
      try {
        const jsonStr = e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
        const json = jsonStr ? JSON.parse(jsonStr) : undefined;
        const nbest = json?.NBest?.[0];
        const lexical = (nbest?.Lexical ?? "").trim();
        const display = (nbest?.Display ?? e.result.text ?? "").trim();
        const chosen = lexical || display;
        lastFinalRef.current = { text: chosen, json, sdkResult: e.result, ts: Date.now() };
      } catch {
        lastFinalRef.current = { text: e.result.text ?? "", sdkResult: e.result, ts: Date.now() };
      }
    };

    rec.canceled = (_s, ev) => {
      setIsScoring(false);
      if (ev?.errorDetails) setError(ev.errorDetails);
      cleanupRecognizer();
    };

    rec.startContinuousRecognitionAsync(
      () => {},
      (err) => { setError(toErr(err)); cleanupRecognizer(); }
    );

    recognizerRef.current = rec;
  }

  /* ---------- scoring ---------- */
  async function persistScore(latestScore: number) {
    setSaveMsg("");
    try {
      const res = await fetch("/api/visitor-scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_uuid: wordUuid,
          score: latestScore,
          category_slug: categorySlug,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.message || "Save failed");

      onScored?.(latestScore, wordUuid);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("score-updated", { detail: {
          wordUuid, score: latestScore, overall: j.overall, scores: j.scores
        }}));
      }
      setSaveMsg("Saved ✓");
    } catch (e:any) {
      setSaveMsg("");
      setError(e?.message || "Failed to save score");
    }
  }

  async function stopAndScore() {
    if (scoringRef.current) return;
    scoringRef.current = true;

    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }

    setIsRecording(false);
    setIsScoring(true);
    setStatus("Scoring…");

    await new Promise<void>((resolve) => {
      try {
        recognizerRef.current?.stopContinuousRecognitionAsync(() => resolve(), () => resolve());
      } catch { resolve(); }
    });
    await new Promise(r => setTimeout(r, FINAL_GRACE_MS));

    try {
      const data = lastFinalRef.current;
      if (!data || data.ts < attemptStartTsRef.current) {
        setError("We didn’t detect your voice. Please try again closer to the microphone.");
        return;
      }

      const saidNorm = normalizeArabic(data.text);
      if (!saidNorm) {
        setError("We didn’t catch any words that time. Try speaking a bit slower and closer to the mic.");
        return;
      }

      const nb = data.json?.NBest?.[0];
      const pa = sdk.PronunciationAssessmentResult.fromResult(data.sdkResult!);
      const jsonScore = Math.round(nb?.PronunciationAssessment?.PronScore ?? 0);
      const overall = Math.round(Math.max(0, Math.min(100, pa?.pronunciationScore ?? jsonScore ?? 0)));
      const paErrorNone = (nb?.PronunciationAssessment?.ErrorType === "None");

      const sim = charSimilarity(saidNorm, targetNorm);

      // Accept more leniently
      const accept = overall >= ACCEPT_SCORE || paErrorNone || sim >= ACCEPT_RATIO;

      if (!accept) {
        if (sim < 0.35) {
          setError("We couldn’t confidently match the target word. Try speaking a bit slower and closer to the mic.");
        } else {
          setError("We heard you clearly, but the pronunciation didn’t quite match. Try again and focus on the consonants and vowels.");
        }
        return;
      }

      setScore(overall);
      setBestScore(prev => prev == null ? overall : Math.max(prev, overall));

      await persistScore(overall);

      // Auto-close only if the score passes the threshold (>= ACCEPT_SCORE)
      if (AUTO_CLOSE_ON_PASS && overall >= ACCEPT_SCORE) {
        window.setTimeout(() => {
          // let user see "Saved ✓" briefly
          onClose();
        }, AUTO_CLOSE_DELAY_MS);
      }
    } catch (e:any) {
      setError(e?.message || "Failed to score.");
    } finally {
      setIsScoring(false);
      setStatus("");
      scoringRef.current = false;
      cleanupRecognizer();
    }
  }

  /* ---------- mic toggle ---------- */
  const onMicClick = async () => {
    if (isScoring || scoringRef.current) return;

    if (!isRecording) {
      if (isIntroPlaying) return;
      if (!isRecReady) { setWarn("Microphone is blocked or not available. Please allow mic access in your browser/OS settings."); return; }
      if (!auth || !!tokenErr) { setError(tokenErr || "Token not ready. Please try again in a moment."); return; }

      setError(""); setWarn(""); setStatus("Listening… speak now");
      lastFinalRef.current = null; attemptStartTsRef.current = Date.now();

      setIsRecording(true);
      startRecognizer();

      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      autoTimerRef.current = setTimeout(() => { void stopAndScore(); }, AUTO_STOP_MS);
      return;
    }

    await stopAndScore();
  };

  /* ---------- UI ---------- */
  if (!open) return null;

  const showMic = (bestScore ?? -1) < 100;
  const micDisabled =
    isScoring || scoringRef.current || !auth || !!tokenErr || !isRecReady || isIntroPlaying;

  const barColor =
    score === null ? "bg-slate-600" :
    score < 50     ? "bg-rose-500"  :
    score < 80     ? "bg-amber-400" :
    score < 100    ? "bg-emerald-500" : "bg-emerald-600";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      
      {/* WIDER, NICER CARD (design unchanged) */}
      <div className="relative mx-4 w-full sm:max-w-3xl lg:max-w-4xl min-w-[320px] rounded-3xl overflow-hidden shadow-2xl bg-white">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-50 px-6 sm:px-8 py-5 border-b border-amber-200/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-end gap-4">
                <span className="ar-font text-3xl sm:text-4xl lg:text-5xl font-semibold text-slate-900" dir="rtl" lang="ar">
                  {arabic}
                </span>
                <button
                  onClick={onPlaySample}
                  className="shrink-0 rounded-full border border-amber-300 bg-white hover:bg-amber-50 p-3 shadow-sm"
                  aria-label="Play sample"
                  title="Play sample"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5l-5 4H3v6h3l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 5.93a9 9 0 010 12.73" />
                  </svg>
                </button>
              </div>
              {introAutoPlayFailed && (
                <div className="mt-2 text-[12px] text-slate-600 text-right">
                  Autoplay blocked. Tap the speaker to play the sample.
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 p-2 shadow-sm"
              aria-label="Close"
              title="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative bg-slate-900">
          <div className="px-6 sm:px-8 py-8">
            {/* Score bar */}
            <div className="relative w-full h-8 rounded-full bg-slate-800 overflow-hidden shadow-inner">
              <div
                className={`absolute left-0 top-0 h-full transition-all ${barColor}`}
                style={{ width: `${score ?? 0}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[13px] sm:text-sm font-semibold text-white/90 tracking-wide">
                  {score === null ? "0/100" : `${score}/100`}
                </span>
              </div>
            </div>

            {/* Messages row */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 min-h-[20px]">
              <div className="flex items-center gap-3">
                {isRecording && (
                  <span className="inline-flex items-center text-emerald-300 text-xs sm:text-[13px]">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                    Listening… speak now
                  </span>
                )}
                {isScoring && (
                  <span className="inline-flex items-center text-sky-300 text-xs sm:text-[13px]">
                    <svg className="mr-2 h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
                      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3"/>
                    </svg>
                    Scoring…
                  </span>
                )}
                {saveMsg && (
                  <span className="inline-flex items-center text-emerald-300 text-xs sm:text-[13px]">
                    {saveMsg}
                  </span>
                )}
              </div>
              <div className="sm:ml-auto flex items-center gap-3">
                {warn && <span className="text-amber-300 text-xs sm:text-[13px] truncate">{warn}</span>}
                {(error || tokenErr) && (
                  <span className="text-rose-300 text-xs sm:text-[13px] truncate">{error || tokenErr}</span>
                )}
              </div>
            </div>

            {/* Big mic control row */}
            <div className="mt-8 flex items-center justify-center">
              {showMic && (
                <button
                  onClick={onMicClick}
                  disabled={isScoring || scoringRef.current || !auth || !!tokenErr || !isRecReady || isIntroPlaying}
                  className={[
                    "h-20 w-20 sm:h-24 sm:w-24 rounded-full shadow-lg transition",
                    "flex items-center justify-center",
                    isScoring || scoringRef.current
                      ? "bg-slate-700 text-slate-300 cursor-wait"
                      : isIntroPlaying
                      ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                      : !isRecording
                      ? "bg-sky-600 hover:bg-sky-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white",
                  ].join(" ")}
                  aria-label={isRecording ? "Stop and score" : "Start recording"}
                  title={
                    isIntroPlaying
                      ? "Wait until the sample finishes playing twice"
                      : isRecording
                      ? "Stop and score"
                      : "Record"
                  }
                >
                  {isRecording ? (
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="7" y="7" width="10" height="10" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Helper hints */}
            <div className="mt-6 text-center text-slate-300 text-xs sm:text-[13px]">
              Click the speaker to replay the sample. Tap the mic to record; we’ll auto-stop after a few seconds and score you.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
