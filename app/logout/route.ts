// app/logout/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL("/", req.url);           // go back to login/root
  const res = NextResponse.redirect(url);
  res.cookies.set("session", "", { path: "/", maxAge: 0 }); // clear JWT cookie
  return res;
}
