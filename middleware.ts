import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED = ["/course", "/courses"]; // add any other prefixes you want

function needsAuth(pathname: string) {
  return PROTECTED.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!needsAuth(pathname)) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) {
    const login = new URL("/", req.url);
    login.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(login);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return NextResponse.next();
  } catch {
    const login = new URL("/", req.url);
    login.searchParams.set("returnTo", pathname + search);
    const res = NextResponse.redirect(login);
    res.cookies.set("session", "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
