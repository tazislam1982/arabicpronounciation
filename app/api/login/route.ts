// app/api/login/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbUser = {
  id: number;
  uuid: string;
  name: string;
  email: string;              // citext in DB → string in TS
  password_hash: string;
  role: "admin" | "visitor";
};

export async function POST(req: Request) {
  // Parse body safely
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required" },
      { status: 400 }
    );
  }

  // If users.email is CITEXT, this compare is already case-insensitive.
  // If it's TEXT, use: where lower(email) = lower(${email})
  const rows = (await sql`
    select id, uuid, name, email, password_hash, role
    from users
    where email = ${email}
    limit 1
  `) as DbUser[];

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  const ok = await compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSession({
    sub: user.uuid,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email, role: user.role },
  });

  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
