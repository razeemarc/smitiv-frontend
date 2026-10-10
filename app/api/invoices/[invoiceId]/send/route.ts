import { backendUnavailable, fetchBackend, forwardResponse } from "@/lib/backend-api";

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { invoiceId } = await context.params;
  try {
    const response = await fetchBackend(`/api/v1/invoices/${encodeURIComponent(invoiceId)}/send`, {
      method: "POST",
      headers: { "Idempotency-Key": request.headers.get("Idempotency-Key") ?? crypto.randomUUID() },
    });
    return forwardResponse(response);
  } catch {
    return backendUnavailable();
  }
}
