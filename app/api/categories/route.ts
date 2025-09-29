// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { getUserIdByUuid, listCategoriesWithProgressForUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET() {
  // read JWT session cookie and resolve user id
  const token = cookies().get("session")?.value;
  if (!token) return NextResponse.json({ ok: false, items: [] }, { status: 401 });

  try {
    const payload = await verifySession(token);
    const userId = await getUserIdByUuid(payload.sub);
    if (!userId) return NextResponse.json({ ok: false, items: [] }, { status: 401 });

    const items = await listCategoriesWithProgressForUser(userId);
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, items: [] }, { status: 401 });
  }
}
