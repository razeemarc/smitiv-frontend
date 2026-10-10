const backendBaseUrl = (process.env.BACKEND_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export async function fetchBackend(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${backendBaseUrl}${path}`, { ...init, cache: "no-store" });
}

export function backendUnavailable(): Response {
  return Response.json(
    { error: { code: "BACKEND_UNAVAILABLE", message: "The API is unavailable right now." } },
    { status: 502 },
  );
}

export function forwardResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}
