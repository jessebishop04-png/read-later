import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Used by Railway and docker-compose to verify the process and SQLite are reachable. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up" }, { status: 200 });
  } catch (err) {
    console.error("read-later: /api/health database check failed", err);
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
