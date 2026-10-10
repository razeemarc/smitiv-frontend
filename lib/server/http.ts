import { Prisma } from "@/generated/prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function prismaErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  return (error as unknown as { code: string }).code;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body contains invalid JSON");
  }
}

export async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body contains invalid JSON");
  }
}

export function queryObject(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export async function withApiErrors(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: { code: error.code, message: error.message, ...(error.details && typeof error.details === "object" ? error.details : {}) } }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return Response.json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
        },
      }, { status: 400 });
    }
    const prismaCode = prismaErrorCode(error);
    if (prismaCode === "P2002") return Response.json({ error: { code: "CUSTOMER_EMAIL_CONFLICT", message: "A customer with this email already exists" } }, { status: 409 });
    if (prismaCode === "P2003") return Response.json({ error: { code: "CUSTOMER_HAS_WORK_ORDERS", message: "Customer cannot be deleted while work orders are linked to it" } }, { status: 409 });
    if (prismaCode === "P2025") return Response.json({ error: { code: "NOT_FOUND", message: "The requested resource was not found" } }, { status: 404 });
    console.error("Unhandled API error", error);
    return Response.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } }, { status: 500 });
  }
}

export function missing(resource: "CUSTOMER" | "WORK_ORDER" | "INVOICE"): ApiError {
  return new ApiError(404, `${resource}_NOT_FOUND`, `${resource === "WORK_ORDER" ? "Work order" : resource[0] + resource.slice(1).toLowerCase()} not found`);
}
