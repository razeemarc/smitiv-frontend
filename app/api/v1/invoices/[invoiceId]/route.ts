import { invoiceService } from "@/lib/server/invoice-service";
import { withApiErrors } from "@/lib/server/http";
import { uuidSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ invoiceId: string }> };

export async function GET(_request: Request, context: Context) {
  return withApiErrors(async () => {
    const { invoiceId: rawId } = await context.params;
    const invoiceId = uuidSchema.parse(rawId);
    return Response.json({ data: await invoiceService.get(invoiceId) });
  });
}
