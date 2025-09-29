// app/login-client.tsx
"use client";

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams(); // now safely behind Suspense
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState<string | null>(sp.get('error')); // example

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data?.message || "Login failed");
      return;
    }
    window.location.href = "/course";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="h-10 sm:h-16" />
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 my-10">
        <div className="w-full max-w-[560px]">
          <div className="mx-auto bg-white/95 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,.15)] p-6 sm:p-10">
            <h1 className="text-center text-3xl font-semibold text-slate-900">Welcome!</h1>

            {err && (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">
                {err}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full rounded-full bg-[#fff8bf] focus:bg-[#fff5a6] px-5 py-3.5 outline-none ring-0 border border-yellow-200 text-slate-900 placeholder:text-slate-500"
                />
              </div>

              <div className="relative">
                <input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-full bg-[#fff8bf] focus:bg-[#fff5a6] px-5 py-3.5 outline-none ring-0 border border-yellow-200 text-slate-900 placeholder:text-slate-500 tracking-widest"
                />
              </div>

              <button type="submit" className="w-full rounded-full btn-base hover:btn-base active:scale-[.99] transition text-white font-semibold py-3.5">
                Sign in
              </button>

              <div className="flex items-center justify-between text-sm text-slate-600 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#334ac1] focus:ring-[#334ac1]"
                  />
                  <span>Remember</span>
                </label>

                <div className="flex items-center gap-2">
                  <a className="hover:underline" href="#">Forgot password</a>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
