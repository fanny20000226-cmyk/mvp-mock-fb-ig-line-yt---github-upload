import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  const hasSupabaseCookie = request.cookies.get("carcare-session");

  if (!hasSupabaseCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/operations/:path*",
    "/annotations/:path*",
    "/finance/:path*",
    "/hr/:path*",
    "/bonus/:path*",
    "/permissions/:path*"
  ]
};
