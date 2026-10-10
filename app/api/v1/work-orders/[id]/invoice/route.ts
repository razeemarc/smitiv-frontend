import { invoiceService } from "@/lib/server/invoice-service";
import { readOptionalJson, withApiErrors } from "@/lib/server/http";
import { invoiceBodySchema, uuidSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return withApiErrors(async () => {
    const { id: rawId } = await context.params;
    const id = uuidSchema.parse(rawId);
    invoiceBodySchema.parse(await readOptionalJson(request));
    const result = await invoiceService.createOrGet(id);
    return Response.json({ data: result.invoice }, { status: result.created ? 201 : 200 });
  });
}
