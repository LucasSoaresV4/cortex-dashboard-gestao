import { getDashboardData } from "../../../worker/dashboard-data";
import { databaseEnv } from "../../../worker/database";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const env = databaseEnv();
  if (!env) {
    return Response.json(
      { error: "Integração não configurada" },
      { status: 503 },
    );
  }

  try {
    const data = await Promise.race([
      getDashboardData(env),
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
