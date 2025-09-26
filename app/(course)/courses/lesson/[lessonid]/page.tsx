// app/course/listen/[lessonid]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Progress } from "@/components/Progress";
import { Pagination } from "@/components/pagination";
import PronouncePopup from "@/components/pronounce-popup";

type PageProps = {
  params: { lessonid: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

/* ------------------------------- DATA -------------------------------- */
const NAMES = [
  "الرَّحْمَنُ","الرَّحِيمُ","الْمَلِكُ","الْقُدُّوسُ","السَّلاَمُ","الْمُؤْمِنُ","الْمُهَيْمِنُ",
  "الْعَزِيزُ","الْجَبَّارُ","الْمُتَكَبِّرُ","الْخَالِقُ","الْبَارِئُ","الْمُصَوِّرُ","الْغَفَّارُ",
  "الْقَهَّارُ","الْوَهَّابُ","الرَّزَّاقُ","الْفَتَّاحُ","اَلْعَلِيمُ","الْقَابِضُ","الْبَاسِطُ",
  "الْخَافِضُ","الرَّافِعُ","المُعِزُّ","المُذِلُّ","السَّمِيعُ","الْبَصِيرُ","الْحَكَمُ","الْعَدْلُ",
  "اللَّطِيفُ","الْخَبِيرُ","الْحَلِيمُ","الْعَظِيمُ","الْغَفُورُ","الشَّكُورُ","الْعَلِيُّ",
  "الْكَبِيرُ","الْحَفِيظُ","المُقيِتُ","الْحسِيبُ","الْجَلِيلُ","الْكَرِيمُ","الرَّقِيبُ",
  "الْمُجِيبُ","الْوَاسِعُ","الْحَكِيمُ","الْوَدُودُ","الْمَجِيدُ","الْبَاعِثُ","الشَّهِيدُ",
  "الْحَقُ","الْوَكِيلُ","الْقَوِيُ","الْمَتِينُ","الْوَلِيُ","الْحَمِيدُ","الْمُحْصِي","الْمُبْدِئُ",
  "الْمُعِيدُ","الْمُحْيِي","المُمِيت","الْحَيُّ","الْقَيُّومُ","الْوَاجِدُ","الْمَاجِدُ","الْواحِدُ",
  "اَلاَحَد","الصَّمَدُ","الْقَادِرُ","المُقْتَدِرُ","المُقَدِّمُ","المُؤَخِّرُ","الأوَّلُ","الآخِرُ",
  "الظَّاهِرُ","الْبَاطِنُ","الْوَالِي","المتعالي","الْبَرُّ","التَّوَابُ","المُنْتَقِمُ","العَفُوُ",
  "الرؤوف","مَالِكُ الْمُلْك","ذُوالْجَلاَلِ وَالإكْرَام","المُقْسِط","الْجَامِع","الغني","المُغْنِي",
  "المَانِع","الضَارَ","النَافِع","النُّورُ","الْهَادِي","الْبَدِيعُ","اَلْبَاقِي","الْوَارِثُ",
  "الرشيد","الصبور"
];

const videoIdMap: Record<string, string> = {};
const FALLBACK_VIDEO = "UxMvdQKXeBw";
const PAGE_SIZE = 10;

/* ---------------------------- Mic helpers ---------------------------- */
type MicPermission = "granted" | "denied" | "prompt" | "unsupported";
type MicState = {
  hasDevice: boolean | null;
  permission: MicPermission;
  lastError?: string;
};

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
    } else {
      state.permission = "unsupported";
    }
  } catch (err: any) {
    state.lastError = String(err?.message || err);
  }
  return state;
}

/* --------------------------------- PAGE --------------------------------- */
export default function LessonPage({ params, searchParams }: PageProps) {
  const { lessonid } = params;
  const initialSlug = (searchParams?.slug as string) || undefined;

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupCtx, setPopupCtx] = useState<{ word: string; audioUrl: string } | null>(null);

  /* ---------- Pagination synced to ?page= so refresh keeps same page ---------- */
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(NAMES.length / PAGE_SIZE));
  const parsePage = (val: string | null) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, totalPages);
  };
  const initialPage = parsePage((searchParams?.page as string) ?? null);
  const [page, setPage] = useState<number>(initialPage);

  const setPageAndURL = (p: number) => {
    const clamped = Math.min(Math.max(p, 1), totalPages);
    setPage(clamped);
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(clamped));
    if (initialSlug) params.set("slug", initialSlug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const current = parsePage(sp.get("page"));
    if (current !== page) setPage(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, NAMES.length);
  const pageItems = useMemo(() => NAMES.slice(start, end), [start, end]);

  /* ----------------------- Expandable rows & actions ---------------------- */
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const toggleOpen = (globalIndex: number) =>
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(globalIndex) ? n.delete(globalIndex) : n.add(globalIndex);
      return n;
    });

  const playAudio = (globalIndex: number) => {
    // Use global index so audio file matches across pages (1-based filenames)
    const audio = new Audio(`/${lessonid}/${globalIndex + 1}.mp3`);
    audio.play().catch((err) => console.error("Autoplay blocked:", err));
  };



  const tryAction = (name: string, globalIndex: number) => {
    const audioUrl = `/${lessonid}/${globalIndex + 1}.mp3`;
    setPopupCtx({ word: name, audioUrl });
    setPopupOpen(true);
};

  /* -------------------------- Microphone status -------------------------- */
  const [mic, setMic] = useState<MicState>({ hasDevice: null, permission: "unsupported" });

  const recheckMic = async () => {
    const status = await checkMicrophone();
    setMic(status);
  };

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
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    }
    return () => {
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
      }
      try {
        perm?.removeEventListener?.("change", recheckMic);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNoMic = mic.hasDevice === false;
  const showDenied = mic.permission === "denied";
  const showBanner = showNoMic || showDenied;

  /* -------------------------------- Render -------------------------------- */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Ribbon header */}
      <section className="ribbon">
        <div className="mx-auto max-w-6xl px-4 py-10 text-white">
          <h1 className="text-3xl font-semibold">Lesson: {lessonid}</h1>
          <div className="mt-6 max-w-md">
            <div className="text-sm">Total Score</div>
            <div className="mt-2">
              <Progress value={65} color="bg-amber-500" />
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
                {mic.lastError && (
                  <p className="mt-1 text-[12px] text-rose-900/70">Details: {mic.lastError}</p>
                )}
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

      {/* Main content */}
      <main className="mx-auto max-w-6xl w-full px-4 py-6 space-y-6">
        {/* Top pagination summary */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            Showing <span className="font-medium">{start + 1}</span>–
            <span className="font-medium">{end}</span> of{" "}
            <span className="font-medium">{NAMES.length}</span>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPageAndURL} />
        </div>

        {/* List */}
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {pageItems.map((name, i) => {
              const globalIndex = start + i;
              const isOpen = openIds.has(globalIndex);
              const videoId = videoIdMap[name] ?? FALLBACK_VIDEO;

              return (
                <li key={globalIndex} className="bg-white">
                  {/* Row header: left = toggle; middle = centered name+audio; right = spacer */}
                  {/* Row header */}
                    <div className="px-5 py-4">
                      <div className="grid grid-cols-12 items-center">
                        {/* Left: details toggle */}
                        <div className="col-span-12 sm:col-span-3 flex justify-center sm:justify-start mb-2 sm:mb-0">
                          <button
                            onClick={() => toggleOpen(globalIndex)}
                            className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                            aria-expanded={isOpen}
                            aria-controls={`row-${globalIndex}`}
                          >
                            {isOpen ? "Hide details" : "Show details"}
                          </button>
                        </div>

                        {/* Middle: centered Arabic + sound icon */}
                        <div className="col-span-12 sm:col-span-6 flex items-center justify-center gap-3">
                          <span className="text-xl ar-font" dir="rtl" lang="ar">
                            {name}
                          </span>
                          <button
                            onClick={() => playAudio(globalIndex)}
                            className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 p-2 shadow-sm"
                            aria-label={`Play audio for ${name}`}
                            title="Play"
                          >
                            {/* Sound / speaker icon */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 5l-5 4H3v6h3l5 4V5z" />
                              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 5.93a9 9 0 010 12.73" />
                            </svg>
                          </button>
                        </div>

                        {/* Right: mic button */}
                        <div className="col-span-12 sm:col-span-3 flex justify-center sm:justify-end">
                          <button
                              onClick={() => tryAction(name, globalIndex)}
                              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white p-2 shadow-md"
                              aria-label={`Record your pronunciation of ${name}`}
                              title="Pronounce Yourself"
                            >
                            {/* Mic icon */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                              <path d="M19 10v2a7 7 0 01-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>


                  {/* Expanded body */}
                  {isOpen && (
                    <div id={`row-${globalIndex}`} className="px-5 pb-5 pt-1 bg-slate-50/50">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Meaning / description */}
                          <div className="flex-1 space-y-2">
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1">
                              Word meaning
                            </span>
                            <p className="text-sm text-slate-700 leading-6">
                              Meaning/translation for <strong>{name}</strong> goes here. Add
                              examples or context sentences to help retention.
                            </p>
                            <p className="text-sm text-slate-600">
                              Tip: click <em>Play</em> to hear pronunciation, then use{" "}
                              <em>Try</em> to record and compare.
                            </p>
                          </div>

                          {/* YouTube video */}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-700 mb-2">
                              Related video
                            </div>
                            <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden shadow">
                              <iframe
                                className="absolute inset-0 h-full w-full"
                                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                                title={`YouTube video for ${name}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom pagination */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            Page <span className="font-medium">{page}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPageAndURL} />
        </div>

        {popupCtx && (
          <PronouncePopup
            open={popupOpen}
            onClose={() => setPopupOpen(false)}
            arabic={popupCtx.word}
            audioUrl={popupCtx.audioUrl}
            language="ar-EG"
          />
        )}
      </main>
    </div>
  );
}
