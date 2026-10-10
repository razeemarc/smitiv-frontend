import { customerService } from "@/lib/server/customer-service";
import { queryObject, readJson, withApiErrors } from "@/lib/server/http";
import { createCustomerSchema, listQuerySchema } from "@/lib/server/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const { page, pageSize } = listQuerySchema.parse(queryObject(request));
    return Response.json(await customerService.list(page, pageSize));
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const input = createCustomerSchema.parse(await readJson(request));
    return Response.json({ data: await customerService.create(input) }, { status: 201 });
  });
}
