"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, type CountryDial } from "@/lib/countries";

type Props = {
  /** e.g. "+880" */
  value?: string | null;
  /** onChange provides selected dial code and the whole country object */
  onChange: (dialCode: string, country: CountryDial) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

export default function CountrySelect({
  value,
  onChange,
  disabled,
  className,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = COUNTRIES.find((c) => c.dialCode === value) || null;

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Filter countries by name / iso / dial code
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
    );
  }, [query]);

  useEffect(() => setActiveIdx(0), [query, open]);

  return (
    <div ref={rootRef} className={`relative ${className || ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-56 inline-flex items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 ${buttonClassName || ""}`}
      >
        <span>
          {selected ? `${selected.name} (${selected.dialCode})` : "Country"}
        </span>
        <svg className="size-4 text-slate-500" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 7l5 6 5-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-[28rem] max-w-[88vw] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-200">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or dial code…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <ul
            role="listbox"
            className="max-h-64 overflow-auto p-1"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const c = filtered[activeIdx];
                if (c) {
                  onChange(c.dialCode, c);
                  setOpen(false);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No results</li>
            ) : (
              filtered.map((c, idx) => (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={selected?.dialCode === c.dialCode}
                  className={`px-3 py-2 text-sm cursor-pointer rounded-md ${
                    idx === activeIdx ? "bg-sky-50" : "hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    onChange(c.dialCode, c);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-slate-500">({c.dialCode})</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
