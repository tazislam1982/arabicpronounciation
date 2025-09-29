"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import CountrySelect from "@/components/CountrySelect";
import Link from "next/link";

type Profile = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  phone_country_code: string | null;
  phone_number: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // read-only
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] =
    useState<Profile["gender"]>(null);
  const [code, setCode] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // password modal state
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwPending, setPwPending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data.profile) throw new Error(data?.message || "Failed to load profile");
        const p: Profile = data.profile;
        setName(p.name || "");
        setEmail(p.email || "");
        setDob(p.date_of_birth || "");
        setGender(p.gender || null);
        setCode(p.phone_country_code || "");
        setPhone(p.phone_number || "");
      } catch (e: any) {
        setErr(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date_of_birth: dob || null,
          gender: gender || null,
          phone_country_code: code || null,
          phone_number: phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Update failed");
      setOk("Profile updated successfully.");
    } catch (e: any) {
      setErr(e?.message || "Network error");
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    setPwPending(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        // Prefer server's precise message (e.g. "Old password is incorrect.")
        throw new Error(data?.message || "Password reset failed");
      }
      // session cleared by API → go to login
      router.replace("/");
    } catch (e: any) {
      setPwErr(e?.message || "Network error");
      setPwPending(false);
    }
  };

  return (
    <>
    <div className="mx-auto max-w-3xl w-full px-4">
      <nav aria-label="Breadcrumb" className="mb-10 text-sm text-slate-600">
              <ol className="flex items-center gap-1">
                  <li><Link href="/course" className="text-sky-700 hover:underline">Home</Link></li>
                  <li aria-hidden="true" className="px-1 text-slate-400">/</li>
                  <li aria-current="page" className="text-slate-700">Profile</li>
              </ol>
      </nav>
    </div>
    
    <div className="mx-auto max-w-3xl w-full px-4 pb-8 profile-main">
      
      <h1 className="text-2xl font-semibold">My Profile</h1>

      {/* subtitle + reset link inline */}
      <div className="mt-1 flex items-center gap-3 flex-wrap">
        <p className="text-slate-600">Update your account details.</p>
        <button
          type="button"
          onClick={() => {
            setPwErr(null);
            setOldPassword("");
            setNewPassword("");
            setConfirmNew("");
            setPwOpen(true);
          }}
          className="text-sky-700 hover:underline text-sm font-medium"
        >
          Reset password
        </button>
      </div>

      {err && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          {err}
        </div>
      )}
      {ok && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
          {ok}
        </div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          <div className="h-6 w-1/3 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Name<sup className="text-red-600">*</sup></label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email (read-only) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={email}
                readOnly
              />
            </div>

            {/* Date of birth */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Date of birth</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                value={dob || ""}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Gender</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                value={gender ?? ""}
                onChange={(e) => setGender((e.target.value || null) as Profile["gender"])}
              >
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            {/* Phone: country code + number */}
            <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <div className="mt-1 flex gap-2">
                <CountrySelect
                value={code}
                onChange={(dial) => setCode(dial)}
                />
                <input
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                />
            </div>
            <p className="text-xs text-slate-500 mt-1">
                Stored as country code and national number (e.g., +1 and (171) 234-5678).
            </p>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-sky-600 text-white px-4 py-2 text-sm font-semibold hover:bg-sky-700"
              >
                Save changes
              </button>
            </div>
          </form>

          {/* Password Reset Modal */}
          {pwOpen && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/30" onClick={() => !pwPending && setPwOpen(false)} />
              <div className="absolute inset-0 grid place-items-center p-4">
                <form
                  onSubmit={submitPassword}
                  className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl ring-1 ring-black/5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Reset password</h2>
                    <button
                      type="button"
                      onClick={() => !pwPending && setPwOpen(false)}
                      className="text-slate-500 hover:text-slate-700"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  {pwErr && (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                      {pwErr}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Old password<sup className="text-red-600">*</sup></label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">New password<sup className="text-red-600">*</sup></label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Confirm new password<sup className="text-red-600">*</sup></label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        value={confirmNew}
                        onChange={(e) => setConfirmNew(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => !pwPending && setPwOpen(false)}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={pwPending}
                      className="rounded-md bg-sky-600 text-white px-4 py-2 text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
                    >
                      {pwPending ? "Updating…" : "Update password"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    On successful reset you’ll be signed out and redirected to login.
                  </p>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </>
  );
}
