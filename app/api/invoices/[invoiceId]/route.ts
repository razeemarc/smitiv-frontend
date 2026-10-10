import { backendUnavailable, fetchBackend, forwardResponse } from "@/lib/backend-api";

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { invoiceId } = await context.params;
  try {
    return forwardResponse(await fetchBackend(`/api/v1/invoices/${encodeURIComponent(invoiceId)}`));
  } catch {
    return backendUnavailable();
  }
}
