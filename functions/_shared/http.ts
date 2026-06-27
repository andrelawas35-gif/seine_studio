import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new HttpError(415, "Expected an application/json request body.", "unsupported_media_type");
  }

  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body is not valid JSON.", "invalid_json");
  }
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message }, requestId }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "validation_error",
          message: "Some fields need attention.",
          fields: error.flatten().fieldErrors,
        },
        requestId,
      },
      { status: 422 },
    );
  }

  console.error("Unhandled API error", { requestId, error });
  return json(
    { error: { code: "internal_error", message: "The request could not be completed." }, requestId },
    { status: 500 },
  );
}

export function getRequestId(request: Request): string {
  return request.headers.get("cf-ray") ?? crypto.randomUUID();
}
