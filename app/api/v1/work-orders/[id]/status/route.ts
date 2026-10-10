import { invoiceService } from "@/lib/server/invoice-service";
import { workOrderService } from "@/lib/server/work-order-service";
import { readJson, withApiErrors } from "@/lib/server/http";
import { completeWorkOrderSchema, uuidSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return withApiErrors(async () => {
    const { id: rawId } = await context.params;
    const id = uuidSchema.parse(rawId);
    completeWorkOrderSchema.parse(await readJson(request));
    const data = await workOrderService.complete(id);
    const { invoice } = await invoiceService.createOrGet(id);
    return Response.json({ data, invoice });
  });
}
