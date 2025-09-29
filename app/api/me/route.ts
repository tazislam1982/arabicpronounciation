import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

export async function GET() {
  const token = cookies().get("session")?.value;
  if (!token) return NextResponse.json({ user: null });
  try {
    const user = await verifySession(token);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
