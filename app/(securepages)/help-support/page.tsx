"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Company = {
  id: number;
  uuid: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  contact_person_name: string | null;
  contact_person_email: string | null;
  contact_phone_country_code: string | null;
  contact_phone_number: string | null;
  contact_hours: string | null;
};

export default function HelpSupportPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/company", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to load company data");
        setCompany(data.company ?? null);
      } catch (e: any) {
        setErr(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (

    <div className="mx-auto max-w-4xl w-full px-4 pb-8">
    
    <nav aria-label="Breadcrumb" className="mb-10 text-sm text-slate-600">
        <ol className="flex items-center gap-1">
            <li><Link href="/course" className="text-sky-700 hover:underline">Home</Link></li>
            <li aria-hidden="true" className="px-1 text-slate-400">/</li>
            <li aria-current="page" className="text-slate-700">Help &amp; Support</li>
        </ol>
    </nav>

      <h1 className="text-2xl font-semibold">Help &amp; Support</h1>
      <p className="text-slate-600 mt-1">Company information and contact details.</p>

      {err && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">{err}</div>
      )}

      {loading ? (
        <div className="mt-6 space-y-4">
          <div className="h-6 w-1/3 bg-slate-200 rounded animate-pulse" />
          <div className="h-24 w-full bg-slate-200 rounded animate-pulse" />
        </div>
      ) : company ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Company details */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Company</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name" value={company.name} />
              <Row
                label="Address"
                value={
                  [company.address_line1, company.address_line2].filter(Boolean).join(", ") || "—"
                }
              />
              <Row label="City" value={company.city || "—"} />
              <Row label="State" value={company.state || "—"} />
              <Row label="Postal code" value={company.postal_code || "—"} />
              <Row label="Country" value={company.country} />
              <Row label="Contact hours" value={company.contact_hours || "—"} />
            </dl>
          </div>

          {/* Contact details */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">Contact</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Person" value={company.contact_person_name || "—"} />
              <Row label="Email" value={company.contact_person_email || "—"} />
              <Row
                label="Phone"
                value={
                  company.contact_phone_country_code || company.contact_phone_number
                    ? `${company.contact_phone_country_code ?? ""} ${company.contact_phone_number ?? ""}`.trim()
                    : "—"
                }
              />
            </dl>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-600">No company profile found.</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-800">{value}</dd>
    </div>
  );
}
