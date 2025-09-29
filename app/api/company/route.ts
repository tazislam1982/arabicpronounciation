import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { getActiveCompany, upsertActiveCompany } from "@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAuth() {
  const token = cookies().get("session")?.value;
  if (!token) throw new Error("unauthorized");
  return await verifySession(token); // { sub, email, name, role }
}

export async function GET() {
  try {
    await requireAuth();
    const company = await getActiveCompany();
    return NextResponse.json({ ok: true, company });
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin") {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const payload = {
      name: body?.name,
      country: body?.country,
      address_line1: body?.address_line1 ?? null,
      address_line2: body?.address_line2 ?? null,
      city: body?.city ?? null,
      state: body?.state ?? null,
      postal_code: body?.postal_code ?? null,
      contact_person_name: body?.contact_person_name ?? null,
      contact_person_email: body?.contact_person_email ?? null,
      contact_phone_country_code: body?.contact_phone_country_code ?? null,
      contact_phone_number: body?.contact_phone_number ?? null,
      contact_hours: body?.contact_hours ?? null,
    };

    // rudimentary validation
    if (!payload.name || !payload.country) {
      return NextResponse.json({ ok: false, message: "Name and country are required." }, { status: 400 });
    }

    const updated = await upsertActiveCompany(payload);
    return NextResponse.json({ ok: true, company: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
}
