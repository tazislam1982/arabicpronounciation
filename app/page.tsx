"use client";
import Footer from "@/components/Footer"
import Header from "@/components/Header"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [email, setEmail] = useState("")
  const [pwd, setPwd] = useState("")
  const [remember, setRemember] = useState(false)
  const [lang, setLang] = useState("English")

  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setPending(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd, remember }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setErr(data?.message || "Login failed. Please check your credentials.")
        setPending(false);
        return;
      }

      // success: session cookie is set by /api/login
      const returnTo = sp.get("returnTo");
      router.push(returnTo || "/course"); // or "/courses"
    } catch {
      setErr("Network error. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Top spacer for breathing room */}
      <div className="h-10 sm:h-16" />

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 my-10">
        <div className="w-full max-w-[560px]">
          <div className="mx-auto bg-white/95 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,.15)] p-6 sm:p-10">
            <h1 className="text-center text-3xl font-semibold text-slate-900">
              Welcome!
            </h1>

            {/* Error banner */}
            {err && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-4 mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <p>{err}</p>
                  <button
                    type="button"
                    onClick={() => setErr(null)}
                    className="ml-2 rounded p-1 text-rose-700 hover:bg-rose-100"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
                disabled={pending}
                className="w-full rounded-full btn-base hover:btn-base active:scale-[.99] transition text-white font-semibold py-3.5 disabled:opacity-60"
              >
                {pending ? "Signing in…" : "Sign in"}
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
                  <span>Remember</span>
                </label>

                <div className="flex items-center gap-2">
                  <a className="hover:underline" href="#">
                    Forgot password
                  </a>
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
