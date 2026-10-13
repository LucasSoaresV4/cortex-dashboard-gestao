/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { getDashboardData } from "./dashboard-data";
import { releaseDatabase } from "./database";

interface Env {
  ASSETS: Fetcher;
  TFHUB_SUPABASE_URL?: string;
  TFHUB_SUPABASE_SECRET_KEY?: string;
  PG_HOST?: string;
  PG_PORT?: string;
  PG_DB?: string;
  PG_USER?: string;
  PG_PASSWORD?: string;
  PG_SCHEMA?: string;
  PG_SSLMODE?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/dashboard") {
      if (request.method !== "GET") {
        return Response.json({ error: "Método não permitido" }, { status: 405 });
      }
      const hasPostgres = env.PG_HOST && env.PG_DB && env.PG_USER && env.PG_PASSWORD;
      const hasSupabase = env.TFHUB_SUPABASE_URL && env.TFHUB_SUPABASE_SECRET_KEY;
      if (!hasPostgres && !hasSupabase) {
        return Response.json({ error: "Integração não configurada" }, { status: 503 });
      }
      const requestEnv = hasPostgres ? { ...env, PG_REQUEST_ID: crypto.randomUUID() } : env;
      try {
        const data = await Promise.race([
          getDashboardData(requestEnv),
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
          {
            status: 502,
            headers: {
              "cache-control": "private, no-store",
              "x-content-type-options": "nosniff",
            },
          },
        );
      } finally {
        await releaseDatabase(requestEnv);
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
