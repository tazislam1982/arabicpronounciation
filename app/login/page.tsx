'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
 
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [remember, setRemember] = useState(false)
  const [lang, setLang] = useState('English')

  const onSubmit = (e: React.FormEvent) => {
     
    e.preventDefault();
    // TODO: hook up your auth call here
    console.log({ email, pwd, remember, lang })
    router.push('/course')
   
  }

  return (
    <div className="min-h-screen  flex flex-col">
      <Header />
      {/* Top spacer for breathing room */}
      <div className="h-10 sm:h-16" />

      {/* Logo */}
      <div className="mx-auto flex items-center gap-2 select-none">
        <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-10">
            Arabic <span className="text-sky-700">Language Course</span>
        </span>
      </div>

      {/* Card */}
      <main className="flex-1 flex items-start sm:items-center justify-center px-4">
        <div className="w-full max-w-[560px]">
          <div className="mx-auto bg-white/95 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,.15)] p-6 sm:p-10">
            <h1 className="text-center text-3xl font-semibold text-slate-900">
              Welcome!
            </h1>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              {/* Email */}
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

              {/* Password */}
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

              {/* Sign in button */}
              <button
                type="submit"
                className="w-full rounded-full btn-base hover:btn-base active:scale-[.99] transition text-white font-semibold py-3.5"
              >
                Sign in
              </button>

              {/* Remember + links row */}
              <div className="flex items-center justify-between text-sm text-slate-600 pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#334ac1] focus:ring-[#334ac1]"
                  />
                  <span>
                    Remember 
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <a className="hover:underline" href="#">Forgot password</a>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Decorative strip (bottom illustrations placeholder) */}
      <div className="mt-12 mb-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-28 sm:h-32 w-full rounded-2xl bg-yellow-200/40 border border-yellow-300/40 grid place-items-center text-yellow-800/80 text-sm">
            Add your illustration strip here (images / SVGs)
          </div>
        </div>
      </div>

      {/* Footer */}
        <Footer/>   
    </div>
  );
}
