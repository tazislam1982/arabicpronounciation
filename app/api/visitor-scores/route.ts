import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { getUserIdByUuid, getCategoryBySlug } from "@/lib/dal";
import { upsertVisitorScoreLatest, latestScoresForUserInCategory } from "@/lib/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: Request) {
  try {
    const token = cookies().get("session")?.value;
    if (!token) return NextResponse.json({ ok:false, message:"Unauthorized" }, { status:401 });
    const payload = await verifySession(token);
    const userId = await getUserIdByUuid(payload.sub);
    if (!userId) return NextResponse.json({ ok:false, message:"Unauthorized" }, { status:401 });

    const body = await req.json().catch(()=> ({}));
    const word_uuid = String(body?.word_uuid || "");
    const score = Number(body?.score);
    const category_slug = String(body?.category_slug || "");

    if (!word_uuid || !Number.isFinite(score))
      return NextResponse.json({ ok:false, message:"word_uuid and numeric score are required" }, { status:400 });

    await upsertVisitorScoreLatest(userId, word_uuid, Math.max(0, Math.min(100, Math.round(score))));

    let overall: number | undefined;
    let scores: Record<string, number> | undefined;
    if (category_slug) {
      const cat = await getCategoryBySlug(category_slug);
      if (cat) {
        const res = await latestScoresForUserInCategory(userId, cat.id);
        overall = res.overall;
        scores = res.byWord;
      }
    }

    return NextResponse.json({ ok:true, overall, scores });
  } catch (e:any) {
    return NextResponse.json({ ok:false, message:"Server error" }, { status:500 });
  }
}
