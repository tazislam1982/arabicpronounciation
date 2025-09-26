"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="w-full bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/course" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-yellow flex items-center justify-center">
            <span className="font-bold">أ</span>
          </div>
          <span className="font-semibold">My Pronounciation</span>
        </Link>

       

        <div className="ml-auto relative" ref={menuRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-3 rounded-full px-3 py-1.5 hover:bg-slate-100 transition"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div className="w-9 h-9 rounded-full bg-slate-200 grid place-items-center">
              <span className="text-slate-600">👤</span> 
            </div>
            <span className="text-sm text-slate-700">Jawhar Khwaja</span>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white ring-1 ring-black/5 menu-shadow overflow-hidden z-50"
            >
     
              <MenuItem href="#">Edit Profile</MenuItem>
 
              <MenuItem href="#">My Achievements</MenuItem>
              <MenuItem href="#">Help &amp; Support</MenuItem>
              <div className="border-t" />
              <MenuItem href="/" emphasis>Sign Out</MenuItem>
            </div>
          )}
        </div>
        <div>
          <button></button>
        </div>
      </div>
    </header>
  );
}

function MenuItem({ href, children, emphasis }: { href: string, children: React.ReactNode, emphasis?: boolean }) {
  return (
    <a
      href={href}
      className={`block px-4 py-2.5 text-sm hover:bg-slate-50 ${emphasis ? "text-rose-600 font-medium" : "text-slate-700"}`}
    >
      {children}
    </a>
  );
}
