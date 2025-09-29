// components/CategoryList.tsx
"use client";

import { useEffect, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import type { CategoryWithProgress } from "@/types/db";

export default function CourseListClient({ categories }: { categories: CategoryWithProgress[] }) {
  // Gate rendering till client is mounted to avoid SSR/CSR mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
      {categories.length === 0 ? (
        <div className="card p-6">
          <p className="text-slate-600">No categories yet.</p>
        </div>
      ) : (
        categories.map((cat) => {
          const minutes = Math.max(5, Math.round(cat.number_of_items * 0.5));
          const cta = cat.attempts > 0 ? "Continue" : "Start";

          return (
            <div key={cat.id} className="card p-0 overflow-hidden">
              <div className="p-5">
                <CategoryCard
                  // name shown as-is; your card can build "Learn • {name}" subtitle
                  name={cat.name}
                  number_of_items={cat.number_of_items}
                  description={cat.description ?? ""}
                  slug={cat.slug}          // link target like /course/{slug}
                  minutes={minutes}
                  progress={cat.avg_score} // "80% - In progress" from avg_score
                  cta={cta}                // Start (no attempts) / Continue
                />
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
