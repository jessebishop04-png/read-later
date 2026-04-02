import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (
    req.nextUrl.pathname === "/sw.js" ||
    req.nextUrl.pathname === "/manifest.json" ||
    req.nextUrl.pathname.startsWith("/icons/")
  ) {
    return undefined;
  }

  if (
    req.nextUrl.pathname.startsWith("/api/") &&
    !req.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return undefined;
  }

  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");
  const isPublic =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname.startsWith("/offline") ||
    req.nextUrl.pathname.startsWith("/api/auth");

  if (isLoggedIn && req.nextUrl.pathname === "/") {
    return Response.redirect(new URL("/library", req.nextUrl.origin));
  }

  if (!isLoggedIn && !isAuthPage && !isPublic) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(login);
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/library", req.nextUrl.origin));
  }

  return undefined;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js|workbox-).*)",
  ],
};
