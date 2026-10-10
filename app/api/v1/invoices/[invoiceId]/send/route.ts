import { invoiceService } from "@/lib/server/invoice-service";
import { withApiErrors } from "@/lib/server/http";
import { sendInvoiceHeadersSchema, uuidSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ invoiceId: string }> };

export async function POST(request: Request, context: Context) {
  return withApiErrors(async () => {
    const { invoiceId: rawId } = await context.params;
    const invoiceId = uuidSchema.parse(rawId);
    const parsedHeaders = sendInvoiceHeadersSchema.safeParse({ "idempotency-key": request.headers.get("Idempotency-Key") ?? undefined });
    if (!parsedHeaders.success) throw parsedHeaders.error;
    const result = await invoiceService.send(invoiceId, parsedHeaders.data["idempotency-key"]);
    return Response.json({ data: { ...result, status: "accepted" } }, { status: 202 });
  });
}
