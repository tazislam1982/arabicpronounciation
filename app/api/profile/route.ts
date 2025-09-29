// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbUserProfile = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  phone_country_code: string | null;
  phone_number: string | null;
};

async function requireUserId() {
  const token = cookies().get("session")?.value;
  if (!token) throw new Error("unauthorized");
  const payload = await verifySession(token);
  const rows = (await sql`
    select id from users where uuid = ${payload.sub} limit 1
  `) as { id: number }[];
  const id = rows[0]?.id;
  if (!id) throw new Error("unauthorized");
  return id;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = (await sql`
      select id, uuid, name, email, date_of_birth, gender, phone_country_code, phone_number
      from users
      where id = ${userId}
      limit 1
    `) as DbUserProfile[];

    return NextResponse.json({ ok: true, profile: rows[0] ?? null });
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const name = (body?.name ?? "").toString().trim();
    const date_of_birth = body?.date_of_birth ? String(body.date_of_birth) : null;
    const gender = body?.gender ? String(body.gender) : null;
    const phone_country_code = body?.phone_country_code ? String(body.phone_country_code) : null;
    const phone_number = body?.phone_number ? String(body.phone_number) : null;

    if (!name) {
      return NextResponse.json({ ok: false, message: "Name is required" }, { status: 400 });
    }

    await sql`
      update users
         set name = ${name},
             date_of_birth = ${date_of_birth},
             gender = ${gender},
             phone_country_code = ${phone_country_code},
             phone_number = ${phone_number}
       where id = ${userId}
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
}
