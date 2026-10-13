import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Lo usan el deploy y el monitoreo: 200 si la app y la base responden.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up" });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
