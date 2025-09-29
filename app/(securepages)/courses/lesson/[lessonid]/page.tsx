"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Progress } from "@/components/Progress";
import { Pagination } from "@/components/pagination";
import PronouncePopup from "@/components/pronounce-popup";

type Word = {
  id: number;
  uuid: string;
  word: string;
  meaning: string | null;
  description: string | null;
  explanation_video_url: string | null;
  video_type: "youtube" | "vimeo" | "mp4" | "none";
  audio_url: string | null; // filename like "1.mp3"
};

type LessonData = {
  category: { id: number; uuid: string; slug: string; name: string; description: string | null; number_of_items: number };
  words: Word[];
  scores: Record<string, number>; // latest score by word_uuid
  overall: number;                // avg of latest scores
  total: number;
};

const PAGE_SIZE = 10;

/* ---------- Mic helpers ---------- */
type MicPermission = "granted" | "denied" | "prompt" | "unsupported";
type MicState = { hasDevice: boolean | null; permission: MicPermission; lastError?: string };

async function checkMicrophone(): Promise<MicState> {
  const state: MicState = { hasDevice: null, permission: "unsupported" };
  try {
    if (navigator.mediaDevices?.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      state.hasDevice = devices.some((d) => d.kind === "audioinput");
    } else {
      state.hasDevice = null;
    }
    const anyNav: any = navigator as any;
    if (anyNav.permissions?.query) {
      try {
        const status = await anyNav.permissions.query({ name: "microphone" as any });
        state.permission = (status.state as MicPermission) ?? "unsupported";
      } catch {
        state.permission = "unsupported";
      }
    }
  } catch (err: any) {
    state.lastError = String(err?.message || err);
  }
  return state;
}

/* ---------- Video helpers ---------- */
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  const m1 = u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m1) return m1[1];
  const m2 = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m2) return m2[1];
  const m3 = u.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if (m3) return m3[1];
  return null;
}

/* ---------- Audio URL builder ---------- */
const AUDIO_BASE = (process.env.NEXT_PUBLIC_AUDIO_BASE_URL || "").replace(/\/+$/, ""); // no trailing slash
function buildAudioUrl(slug: string, filename?: string | null, idxHint?: number) {
  const safeSlug = encodeURIComponent(slug);
  const fname = (filename && filename.trim()) || (typeof idxHint === "number" ? `${idxHint + 1}.mp3` : "");
  const safeFile = encodeURIComponent(fname.replace(/^\/+/, ""));
  return `${AUDIO_BASE}/${safeSlug}/${safeFile}`;
}

/* --------------------------------- PAGE --------------------------------- */
export default function LessonPage({ params }: { params: { lessonid: string } }) {
  const lessonid = params.lessonid;

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Data state
  const [data, setData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Row expand state
  const [openWordIds, setOpenWordIds] = useState<Set<string>>(new Set());
  const toggleOpen = (uuid: string) =>
    setOpenWordIds((prev) => {
      const n = new Set(prev);
      n.has(uuid) ? n.delete(uuid) : n.add(uuid);
      return n;
    });

  // Popup
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupCtx, setPopupCtx] = useState<{ word: string; wordUuid: string; audioUrl: string }>({
    word: "",
    wordUuid: "",
    audioUrl: "",
  });

  // Pagination synced to ?page=
  const total = data?.words.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const parsePage = (val: string | null) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, totalPages);
    };
  // Start from URL (or 1)
  const [page, setPage] = useState<number>(1);
  useEffect(() => {
    const p = parsePage(sp.get("page"));
    setPage(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, totalPages]);

  const setPageAndURL = (p: number) => {
    const clamped = Math.min(Math.max(p, 1), totalPages);
    setPage(clamped);
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(clamped));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageItems = useMemo(() => (data ? data.words.slice(start, end) : []), [data, start, end]);

  // Load lesson from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadErr(null);
        const r = await fetch(`/api/lesson/${encodeURIComponent(lessonid)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.message || "Failed to load lesson");
        if (!cancelled) setData(j as LessonData);
      } catch (e: any) {
        if (!cancelled) setLoadErr(e?.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonid]);

  // Listen for popup save event to update list/ribbon in-place
  useEffect(() => {
    const handler = (e: any) => {
      const { scores, overall } = e.detail || {};
      if (!scores) return;
      setData((prev) =>
        prev ? { ...prev, scores, overall: typeof overall === "number" ? overall : prev.overall } : prev
      );
    };
    window.addEventListener("score-updated", handler as EventListener);
    return () => window.removeEventListener("score-updated", handler as EventListener);
  }, []);

  // Mic status
  const [mic, setMic] = useState<MicState>({ hasDevice: null, permission: "unsupported" });
  const recheckMic = async () => setMic(await checkMicrophone());
  useEffect(() => {
    recheckMic();
    const anyNav: any = navigator as any;
    let perm: any;
    if (anyNav?.permissions?.query) {
      anyNav.permissions
        .query({ name: "microphone" as any })
        .then((p: any) => {
          perm = p;
          const handler = () => recheckMic();
          p.addEventListener?.("change", handler);
        })
        .catch(() => {});
    }
    const onDeviceChange = () => recheckMic();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      try {
        perm?.removeEventListener?.("change", recheckMic);
      } catch {}
    };
  }, []);

  const showNoMic = mic.hasDevice === false;
  const showDenied = mic.permission === "denied";
  const showBanner = showNoMic || showDenied;

  const onTry = (w: Word, idx: number) => {
    const url = buildAudioUrl(lessonid, w.audio_url, idx);
    setPopupCtx({ word: w.word, wordUuid: w.uuid, audioUrl: url });
    setPopupOpen(true);
  };

  const onScoredOptimistic = (score: number, wordUuid: string) => {
    // Optional immediate optimism (popup also dispatches event with fresh totals)
    setData((prev) => {
      if (!prev) return prev;
      const nextScores = { ...prev.scores, [wordUuid]: score };
      const vals = Object.values(nextScores) as number[];
      const overall = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
      return { ...prev, scores: nextScores, overall };
    });
  };

  const renderVideo = (w: Word) => {
    if (!w.explanation_video_url || w.video_type === "none") return null;
    if (w.video_type === "youtube") {
      const id = extractYouTubeId(w.explanation_video_url);
      if (!id) return null;
      return (
        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={`YouTube video for ${w.word}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      );
    }
    if (w.video_type === "vimeo") {
      return (
        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={w.explanation_video_url}
            title={`Vimeo video for ${w.word}`}
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      );
    }
    if (w.video_type === "mp4") {
      return <video className="w-full rounded-lg shadow" controls src={w.explanation_video_url} />;
    }
    return null;
  };

  const totalCount = data?.total ?? 0;
  const overall = data?.overall ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Ribbon */}
      <section className="ribbon">
        <div className="mx-auto max-w-6xl px-4 py-10 text-white">
          <h1 className="text-3xl font-semibold">{data ? data.category.name : "Loading…"}</h1>
          <div className="mt-6 max-w-md">
            <div className="text-sm">Total Score</div>
            <div className="mt-2">
              <Progress value={overall} color="bg-amber-500" />
            </div>
          </div>
        </div>
      </section>

      {/* Mic warning banner */}
      {showBanner && (
        <div className="bg-rose-50 border-y border-rose-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-start gap-3 text-rose-800">
              <svg className="w-5 h-5 mt-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 7a1 1 0 012 0v5a1 1 0 11-2 0V7zm1 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                <path d="M10.29 3.86l-7.2 12.47A1.5 1.5 0 004.29 18h15.42a1.5 1.5 0 001.29-2.27l-7.2-12.47a1.5 1.5 0 00-2.58 0z" />
              </svg>
              <div className="text-sm">
                <div className="font-semibold">
                  {showDenied ? "Microphone access is blocked." : "No microphone detected."}
                </div>
                <p className="text-rose-900/80">
                  {showDenied
                    ? "Please allow microphone access in your browser or OS settings and reload the page."
                    : "Please connect a microphone (or enable it) and click Retry."}
                </p>
                {mic.lastError && <p className="mt-1 text-[12px] text-rose-900/70">Details: {mic.lastError}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={recheckMic}
                className="rounded-md bg-white text-rose-800 border border-rose-300 hover:bg-rose-100 px-3 py-1.5 text-sm font-medium"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-md bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 text-sm font-semibold"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="mx-auto max-w-6xl w-full px-4 py-6 space-y-6">
        {loadErr && <div className="card p-4 border border-rose-200 bg-rose-50 text-rose-800">{loadErr}</div>}

        {/* Top summary/pagination */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            {loading ? (
              "Loading…"
            ) : (
              <>
                Showing <span className="font-medium">{Math.min(start + 1, totalCount)}</span>–
                <span className="font-medium">{Math.min(end, totalCount)}</span> of{" "}
                <span className="font-medium">{totalCount}</span>
              </>
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPageAndURL} />
        </div>

        {/* List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {pageItems.map((w, i) => {
                const globalIndex = start + i;
                const isOpen = openWordIds.has(w.uuid);
                const latest = data?.scores[w.uuid];

                const playAudio = () => {
                  const src = buildAudioUrl(lessonid, w.audio_url, globalIndex);
                  const audio = new Audio(src);
                  audio.play().catch(() => {});
                };

                return (
                  <li key={w.uuid} className="bg-white">
                    <div className="px-5 py-4">
                      <div className="grid grid-cols-12 items-center">
                        {/* Toggle */}
                        <div className="col-span-12 sm:col-span-3 flex justify-center sm:justify-start mb-2 sm:mb-0">
                          <button
                            onClick={() => toggleOpen(w.uuid)}
                            className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                            aria-expanded={isOpen}
                            aria-controls={`row-${w.uuid}`}
                          >
                            {isOpen ? "Hide details" : "Show details"}
                          </button>
                        </div>

                        {/* Word + audio + score chip */}
                        <div className="col-span-12 sm:col-span-6 flex items-center justify-center gap-3">
                          <span className="text-xl ar-font" dir="rtl" lang="ar">{w.word}</span>

                          <button
                            onClick={playAudio}
                            className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 p-2 shadow-sm"
                            aria-label={`Play audio for ${w.word}`}
                            title="Play"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 5l-5 4H3v6h3l5 4V5z" />
                              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 5.93a9 9 0 010 12.73" />
                            </svg>
                          </button>

                          {typeof latest === "number" && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Score: {latest}/100
                            </span>
                          )}
                        </div>

                        {/* Record */}
                        <div className="col-span-12 sm:col-span-3 flex justify-center sm:justify-end">
                          <button
                            onClick={() => onTry(w, globalIndex)}
                            className="rounded-full bg-slate-900 hover:bg-slate-800 text-white p-2 shadow-md"
                            aria-label={`Record your pronunciation of ${w.word}`}
                            title="Pronounce Yourself"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                              <path d="M19 10v2a7 7 0 01-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div id={`row-${w.uuid}`} className="px-5 pb-5 pt-1 bg-slate-50/50">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 space-y-2">
                              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1">
                                Word meaning
                              </span>
                              <p className="text-sm text-slate-700 leading-6">
                                {w.meaning ? (
                                  <>{w.meaning}</>
                                ) : (
                                  <>Meaning/translation for <strong>{w.word}</strong> is not provided.</>
                                )}
                              </p>
                              {w.description && <p className="text-sm text-slate-600">{w.description}</p>}
                            </div>

                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-700 mb-2">Related video</div>
                              {renderVideo(w) || <div className="text-xs text-slate-500">No video available.</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Bottom pager */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            Page <span className="font-medium">{page}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPageAndURL} />
        </div>

        {/* Popup */}
        {popupOpen && data && (
          <PronouncePopup
            open={popupOpen}
            onClose={() => setPopupOpen(false)}
            arabic={popupCtx.word}
            audioUrl={popupCtx.audioUrl}
            language="ar-EG"
            wordUuid={popupCtx.wordUuid}
            categorySlug={lessonid}
            onScored={onScoredOptimistic}
          />
        )}
      </main>
    </div>
  );
}
