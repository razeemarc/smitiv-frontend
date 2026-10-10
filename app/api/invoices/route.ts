import { backendUnavailable, fetchBackend, forwardResponse } from "@/lib/backend-api";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const page = query.get("page") ?? "1";
  const pageSize = query.get("pageSize") ?? "20";
  try {
    const response = await fetchBackend(
      `/api/v1/invoices?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    );
    return forwardResponse(response);
  } catch {
    return backendUnavailable();
  }
}
