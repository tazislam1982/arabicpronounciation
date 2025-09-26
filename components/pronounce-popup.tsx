"use client";

import { useEffect, useRef, useState } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

type TokenPayload = { token: string; region: string };

type PronouncePopupProps = {
  open: boolean;
  onClose: () => void;
  arabic: string;    // target Arabic word
  audioUrl: string;  // sample audio
  language?: string; // default "ar-EG"
};

const AUTO_STOP_MS = 5000;
const FINAL_GRACE_MS = 600;

/* ---------- helpers ---------- */
function normalizeArabic(s: string): string {
  if (!s) return "";
  return s
    .replace(/[\u064B-\u065F\u0670]/g, "") // diacritics
    .replace(/\u0640/g, "")                 // tatweel
    .replace(/[^\p{L}\p{N}]+/gu, " ")       // punctuation -> space
    .trim()
    .replace(/\s+/g, " ");
}
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

async function getSpeechToken(): Promise<TokenPayload> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const r = await fetch(`${base}/api/azure-speech-token`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Token fetch failed: ${r.status}`);
  return r.json();
}

/* ---------- component ---------- */
export default function PronouncePopup({
  open,
  onClose,
  arabic,
  audioUrl,
  language = "ar-EG",
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

  const playerRef = useRef<HTMLAudioElement | null>(null);
  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toErrorMsg = (e: unknown) =>
  typeof e === "string" ? e : (e as any)?.message || "Unexpected error";


  // guard flags
  const scoringRef = useRef(false); // re-entry guard for stopAndScore
  const introStartedRef = useRef(false);

  // last final result while recording
  const lastFinalRef = useRef<{
    text: string;
    json?: any;
    sdkResult?: sdk.SpeechRecognitionResult;
    ts: number;
  } | null>(null);
  const attemptStartTsRef = useRef<number>(0);

  const targetNorm = normalizeArabic(arabic);

  /* ---------- init on open ---------- */
  useEffect(() => {
    let mounted = true;
    if (open) {
      setAuth(null); setTokenErr("");
      setIsRecReady(false);
      setIsRecording(false); setIsScoring(false);
      setIsIntroPlaying(true); setIntroAutoPlayFailed(false);
      setStatus(""); setScore(null); setBestScore(null);
      setWarn(""); setError("");
      lastFinalRef.current = null;
      attemptStartTsRef.current = 0;
      introStartedRef.current = false;
      scoringRef.current = false;

      navigator.mediaDevices?.getUserMedia?.({ audio: true })
        .then(() => mounted && setIsRecReady(true))
        .catch(() => { if (mounted) { setIsRecReady(false); setWarn("Microphone is blocked or not available. Please allow mic access in your browser/OS settings."); }});

      getSpeechToken()
        .then((t) => mounted && setAuth(t))
        .catch((e) => mounted && setTokenErr(e?.message || "Token error"));

      // play sample twice, then enable mic
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
          try { await playOnce(); } catch {
            if (mounted) { setIntroAutoPlayFailed(true); setIsIntroPlaying(false); }
          }
        } catch { if (mounted) setIsIntroPlaying(false); }
      };
      void startIntro();
    }
    return () => {
      mounted = false;
      try { playerRef.current?.pause?.(); playerRef.current = null; } catch {}
      cleanupRecognizer();
      if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
      introStartedRef.current = false;
      scoringRef.current = false;
      lastFinalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audioUrl]);

  const onPlaySample = () => {
    try { playerRef.current?.pause?.(); playerRef.current = new Audio(audioUrl); playerRef.current.play().catch(() => {}); } catch {}
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

    // tolerant timeouts, stable partials (we don't render partials)
    speechCfg.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000");
    speechCfg.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "2000");
    speechCfg.setProperty(sdk.PropertyId.SpeechServiceResponse_StablePartialResultThreshold, "3");

    const rec = new sdk.SpeechRecognizer(speechCfg, audioCfg);

    const paCfg = new sdk.PronunciationAssessmentConfig(
      arabic,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
    );
    paCfg.applyTo(rec);

    // buffer ONLY finals
    rec.recognized = (_s, e) => {
      if (e?.result?.reason !== sdk.ResultReason.RecognizedSpeech) return;
      try {
        const jsonStr = e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
        const json = jsonStr ? JSON.parse(jsonStr) : undefined;
        const nbest = json?.NBest?.[0];
        const display = (nbest?.Display ?? e.result.text ?? "") as string;
        lastFinalRef.current = { text: display, json, sdkResult: e.result, ts: Date.now() };
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
    (err) => { setError(toErrorMsg(err)); cleanupRecognizer(); }
    );


    recognizerRef.current = rec;
  }

  async function stopAndScore() {
    if (scoringRef.current) return;            // prevent re-entry
    scoringRef.current = true;

    // clear any pending auto-stop to prevent a second call
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }

    setIsRecording(false);
    setIsScoring(true);
    setStatus("Scoring…");

    // stop recognition
    await new Promise<void>((resolve) => {
      try {
        recognizerRef.current?.stopContinuousRecognitionAsync(() => resolve(), () => resolve());
      } catch { resolve(); }
    });

    // grace wait for trailing final
    await new Promise((r) => setTimeout(r, FINAL_GRACE_MS));

    try {
      const data = lastFinalRef.current;
      if (!data || data.ts < attemptStartTsRef.current) {
        setError("We heard nothing. Try again.");
        return;
      }

      const saidNorm = normalizeArabic(data.text);
      const dist = levenshtein(saidNorm, targetNorm);

      let paErrorNone = false;
      const nb = data.json?.NBest?.[0];
      if (nb?.PronunciationAssessment?.ErrorType) {
        paErrorNone = nb.PronunciationAssessment.ErrorType === "None";
      }

      const accept = (!!saidNorm && (saidNorm === targetNorm || dist <= 1)) || paErrorNone;
      if (!accept) {
        setError("We heard a different word. Please repeat exactly the same word.");
        return;
      }

      const pa = sdk.PronunciationAssessmentResult.fromResult(data.sdkResult!);
      const jsonScore = Math.round(nb?.PronunciationAssessment?.PronScore ?? 0);
      const overall = Math.round(Math.max(0, Math.min(100, pa?.pronunciationScore ?? jsonScore ?? 0)));

      setScore(overall);
      setBestScore((prev) => (prev === null ? overall : Math.max(prev, overall)));
    } catch (e: any) {
      setError(e?.message || "Failed to score.");
    } finally {
      // ALWAYS reset state so UI never hangs
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
      if (!auth || !!tokenErr) { setError(tokenErr || "Token not ready. Please wait a moment and try again."); return; }

      setError(""); setWarn("");
      setStatus("Listening… speak now");
      lastFinalRef.current = null;
      attemptStartTsRef.current = Date.now();

      setIsRecording(true);
      startRecognizer();

      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      autoTimerRef.current = setTimeout(() => { void stopAndScore(); }, AUTO_STOP_MS);
      return;
    }

    await stopAndScore();
  };

  /* ---------- UI ---------- */
  const showMic = (bestScore ?? -1) < 100;
  const micDisabled = isScoring || scoringRef.current || !auth || !!tokenErr || !isRecReady || isIntroPlaying;

  const barColor =
    score === null ? "bg-slate-600" :
    score < 50     ? "bg-rose-500"  :
    score < 80     ? "bg-amber-400" :
    score < 100    ? "bg-emerald-500" : "bg-emerald-600";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      <div className="relative mx-4 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        {/* header */}
        <div className="bg-white p-6">
          <div className="flex items-start justify-end">
            <button onClick={onClose} className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 p-1" aria-label="Close">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <span className="text-2xl ar-font" dir="rtl" lang="ar">{arabic}</span>
            <button onClick={onPlaySample} className="rounded-full border border-sky-200 text-sky-600 bg-white hover:bg-sky-50 p-2 shadow-sm" aria-label="Play sample" title="Play sample">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5l-5 4H3v6h3l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07M19.07 5.93a9 9 0 010 12.73" />
              </svg>
            </button>
          </div>
          {introAutoPlayFailed && <div className="mt-2 text-xs text-slate-500">Audio autoplay was blocked by the browser. Tap the speaker to play the sample.</div>}
        </div>

        {/* body */}
        <div className="relative bg-slate-900 p-6">
          {/* progress */}
          <div className="relative w-full h-6 rounded-full bg-slate-800 overflow-hidden">
            <div className={`absolute left-0 top-0 h-full transition-all ${barColor}`} style={{ width: `${score ?? 0}%` }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[12px] font-semibold text-white/90">{score === null ? "0/100" : `${score}/100`}</span>
            </div>
          </div>

          {/* status/messages (fixed height to avoid layout jumps) */}
          <div className="mt-3 h-5 flex items-center gap-3">
            {isRecording && (
              <span className="inline-flex items-center text-emerald-300 text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                Listening… speak now
              </span>
            )}
            {isScoring && (
              <span className="inline-flex items-center text-sky-300 text-xs">
                <svg className="mr-2 h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
                  <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3"/>
                </svg>
                Scoring…
              </span>
            )}
            <span className="flex-1" />
            {warn && <span className="text-amber-300 text-xs truncate">{warn}</span>}
            {(error || tokenErr) && <span className="text-rose-300 text-xs truncate">{error || tokenErr}</span>}
          </div>

          {/* mic */}
          {(bestScore ?? -1) < 100 && (
            <div className="absolute right-4 bottom-4">
              <button
                onClick={onMicClick}
                disabled={micDisabled}
                className={`rounded-full p-3 shadow-md transition ${
                  isScoring || scoringRef.current
                    ? "bg-slate-700 text-slate-300 cursor-wait"
                    : isIntroPlaying
                    ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                    : !isRecording
                    ? "bg-sky-600 text-white hover:bg-sky-700"
                    : "bg-rose-600 text-white hover:bg-rose-700"
                }`}
                aria-label={isRecording ? "Stop and score" : "Start recording"}
                title={isIntroPlaying ? "Wait until the sample finishes playing twice" : (isRecording ? "Stop and score" : "Record")}
              >
                {isRecording ? (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="7" width="10" height="10" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
