// app/course/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import { Progress } from "@/components/Progress";
import type { CategoryWithProgress } from "@/types/db";

export default function CoursePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CategoryWithProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "Failed to load categories");
        }
        if (!cancelled) setItems(data.items as CategoryWithProgress[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Overall = total attempted words / total words (across ALL categories)
  const overall = useMemo(() => {
    if (!items.length) return 0;
    let totalWords = 0;
    let attempted = 0;
    for (const c of items) {
      totalWords += c.number_of_items ?? 0;
      attempted  += c.attempts ?? 0;
    }
    if (!totalWords) return 0;
    return Math.round((attempted * 100) / totalWords);
  }, [items]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header ribbon */}
      <section className="ribbon">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-3xl font-semibold">Welcome to your plan.</h1>
          <div className="mt-6 max-w-md">
            <div className="text-sm text-white">Arabic Pronunciation</div>
            <div className="mt-2">
              <div suppressHydrationWarning>
                <Progress value={overall} color="bg-amber-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl w-full px-4 py-6 space-y-4">
        {error && (
          <div className="card p-4 border border-rose-200 bg-rose-50 text-rose-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-5 w-1/3 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-1/4 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading &&
          items.map((cat) => {
            const minutes = Math.max(5, Math.round(cat.number_of_items * 0.5));
            const cta = (cat.attempts ?? 0) > 0 ? "Continue" : "Start";
            return (
              <div key={cat.id} className="card p-0 overflow-hidden">
                <div className="p-5">
                  <CategoryCard
                    name={cat.name}
                    number_of_items={cat.number_of_items} // label: "XX Words"
                    description={cat.description ?? ""}
                    slug={cat.slug}                         // /course/{slug}
                    minutes={minutes}
                    progress={cat.completion_pct}           // <-- FIX: completion %, not avg score
                    cta={cta}
                  />
                </div>
              </div>
            );
          })}

        {!loading && items.length === 0 && !error && (
          <div className="card p-6">
            <p className="text-slate-600">No lessons yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
