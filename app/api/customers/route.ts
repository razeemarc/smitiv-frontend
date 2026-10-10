import { backendUnavailable, fetchBackend, forwardResponse } from "@/lib/backend-api";

interface CustomerPage {
  data: Array<Record<string, unknown>>;
  pagination: { totalPages: number };
}

export async function GET(): Promise<Response> {
  try {
    const firstPage = await fetchBackend("/api/v1/customers?page=1&pageSize=100");
    if (!firstPage.ok) return forwardResponse(firstPage);

    const firstResult = await firstPage.json() as CustomerPage;
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, firstResult.pagination.totalPages - 1) }, (_, index) => index + 2)
        .map((page) => fetchBackend(`/api/v1/customers?page=${page}&pageSize=100`)),
    );
    const pageResponses = await Promise.all(remainingPages.map(async (response) => {
      if (!response.ok) throw new Error("Could not load all customers");
      return response.json() as Promise<CustomerPage>;
    }));

    return Response.json({ data: [firstResult, ...pageResponses].flatMap((page) => page.data) });
  } catch {
    return backendUnavailable();
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const response = await fetchBackend("/api/v1/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    });
    return forwardResponse(response);
  } catch {
    return backendUnavailable();
  }
}
