import { backendUnavailable, fetchBackend, forwardResponse } from "@/lib/backend-api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  try {
    const response = await fetchBackend(`/api/v1/work-orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
    return forwardResponse(response);
  } catch {
    return backendUnavailable();
  }
}
