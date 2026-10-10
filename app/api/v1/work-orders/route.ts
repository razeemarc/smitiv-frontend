import { workOrderService } from "@/lib/server/work-order-service";
import { queryObject, readJson, withApiErrors } from "@/lib/server/http";
import { createWorkOrderSchema, listQuerySchema } from "@/lib/server/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const { page, pageSize } = listQuerySchema.parse(queryObject(request));
    return Response.json(await workOrderService.list(page, pageSize));
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const input = createWorkOrderSchema.parse(await readJson(request));
    return Response.json({ data: await workOrderService.create(input) }, { status: 201 });
  });
}
