import { backendUnavailable, fetchBackend, forwardResponse } from "@/lib/backend-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  try {
    const response = await fetchBackend(`/api/v1/work-orders/${encodeURIComponent(id)}/invoice`, {
      method: "POST",
    });
    return forwardResponse(response);
  } catch {
    return backendUnavailable();
  }
}
