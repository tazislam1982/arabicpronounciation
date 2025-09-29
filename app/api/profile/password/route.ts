// app/api/profile/password/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { compare, hash } from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const token = cookies().get("session")?.value;
  if (!token) throw new Error("unauthorized");
  const payload = await verifySession(token);
  const rows = (await sql`
    select id, password_hash from users where uuid = ${payload.sub} limit 1
  `) as { id: number; password_hash: string }[];
  const u = rows[0];
  if (!u) throw new Error("unauthorized");
  return u;
}

export async function PUT(req: Request) {
  try {
    const { id, password_hash } = await requireUser();
    const body = await req.json();

    const oldPassword = String(body?.oldPassword || "");
    const newPassword = String(body?.newPassword || "");
    const confirmNew = String(body?.confirmNew || "");

    if (!oldPassword || !newPassword || !confirmNew) {
      return NextResponse.json(
        { ok: false, error: "FIELDS_REQUIRED", message: "All password fields are required." },
        { status: 400 }
      );
    }
    if (newPassword !== confirmNew) {
      return NextResponse.json(
        { ok: false, error: "NEW_PASSWORD_MISMATCH", message: "New passwords do not match." },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "NEW_PASSWORD_TOO_SHORT", message: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const ok = await compare(oldPassword, password_hash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "OLD_PASSWORD_INVALID", message: "Old password is incorrect." },
        { status: 400 }
      );
    }

    const newHash = await hash(newPassword, 12);
    await sql`update users set password_hash = ${newHash} where id = ${id}`;

    // destroy current session so user logs in again
    const res = NextResponse.json({ ok: true, message: "Password updated. Please sign in again." });
    res.cookies.set("session", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: "Unauthorized." },
      { status: 401 }
    );
  }
}
