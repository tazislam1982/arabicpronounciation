'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (pwd.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    if (pwd !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    if (!agree) {
      setErr('You must accept the Terms to continue.');
      return;
    }

    // TODO: call your register API
    console.log({ name, email, pwd, agree });
  };

  return (
    <div className="min-h-screen  flex flex-col">
      <Header />
      <div className="h-10 sm:h-16" />

      {/* Brand */}
      <div className="mx-auto select-none mb-10">
        <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
          Arabic <span className="text-sky-700">Language Course</span>
        </span>
      </div>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4">
        <div className="w-full max-w-[640px]">
          <div className="mx-auto bg-white/95 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,.15)] p-6 sm:p-10">
            <h1 className="text-center text-3xl font-semibold text-slate-900">
              Create your account
            </h1>

            <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-full bg-[#fff8bf] focus:bg-[#fff5a6] px-5 py-3.5 outline-none border border-yellow-200 text-slate-900 placeholder:text-slate-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-full bg-[#fff8bf] focus:bg-[#fff5a6] px-5 py-3.5 outline-none border border-yellow-200 text-slate-900 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-full bg-[#fff8bf] focus:bg-[#fff5a6] px-5 py-3.5 outline-none border border-yellow-200 text-slate-900 placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-full bg-[#fff8bf] focus:bg-[#fff5a6] px-5 py-3.5 outline-none border border-yellow-200 text-slate-900 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#334ac1] focus:ring-[#334ac1]"
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="text-[#334ac1] hover:underline">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-[#334ac1] hover:underline">
                    Privacy Policy
                  </a>.
                </span>
              </label>

              {err && (
                <p className="text-sm text-rose-600">{err}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-full btn-base hover:btn-base active:scale-[.99] transition text-white font-semibold py-3.5"
              >
                Create account
              </button>

              <p className="text-sm text-center text-slate-600">
                Already have an account?{' '}
                <Link href="/login" className="text-[#334ac1] hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer/>   
    </div>
  );
}
