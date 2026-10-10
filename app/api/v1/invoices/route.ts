import { invoiceService } from "@/lib/server/invoice-service";
import { queryObject, withApiErrors } from "@/lib/server/http";
import { listQuerySchema } from "@/lib/server/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const { page, pageSize } = listQuerySchema.parse(queryObject(request));
    return Response.json(await invoiceService.list(page, pageSize));
  });
}
