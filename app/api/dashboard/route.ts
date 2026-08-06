import { getDashboardData } from "../../../worker/dashboard-data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const TFHUB_SUPABASE_URL = process.env.TFHUB_SUPABASE_URL;
  const TFHUB_SUPABASE_SECRET_KEY = process.env.TFHUB_SUPABASE_SECRET_KEY;

  if (!TFHUB_SUPABASE_URL || !TFHUB_SUPABASE_SECRET_KEY) {
    return Response.json(
      { error: "Integração não configurada" },
      { status: 503 },
    );
  }

  try {
    const data = await Promise.race([
      getDashboardData({ TFHUB_SUPABASE_URL, TFHUB_SUPABASE_SECRET_KEY }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database query timed out")), 25000),
      ),
    ]);

    return Response.json(data, {
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("TFHub external database query failed", error);
    return Response.json(
      { error: "Não foi possível consultar os dados atuais" },
      { status: 502 },
    );
  }
}
