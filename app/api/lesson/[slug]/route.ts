//app/api/lesson/[slug]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import {
  getUserIdByUuid,
  getCategoryBySlug,
  listWordsByCategoryId,
  bestScoresForUserInCategory,
} from "@/lib/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const token = cookies().get("session")?.value;
    if (!token) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    const userId = await getUserIdByUuid(payload.sub);
    if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const category = await getCategoryBySlug(params.slug);
    if (!category) {
      return NextResponse.json({ ok: false, message: "Category not found" }, { status: 404 });
    }

    const words = await listWordsByCategoryId(category.id);
    const { byWord, overall } = await bestScoresForUserInCategory(userId, category.id);

    return NextResponse.json({
      ok: true,
      category,
      words,
      scores: byWord,        // { [word_uuid]: bestScore }
      overall,               // 0..100
      total: words.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Server error" }, { status: 500 });
  }
}
