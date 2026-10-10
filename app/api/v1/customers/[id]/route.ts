import { customerService } from "@/lib/server/customer-service";
import { readJson, withApiErrors } from "@/lib/server/http";
import { updateCustomerSchema, uuidSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function parseId(context: Context) {
  const { id } = await context.params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function GET(_request: Request, context: Context) {
  return withApiErrors(async () => Response.json({ data: await customerService.get(await parseId(context)) }));
}

export async function PATCH(request: Request, context: Context) {
  return withApiErrors(async () => {
    const id = await parseId(context);
    const input = updateCustomerSchema.parse(await readJson(request));
    return Response.json({ data: await customerService.update(id, input) });
  });
}

export async function DELETE(_request: Request, context: Context) {
  return withApiErrors(async () => {
    await customerService.delete(await parseId(context));
    return new Response(null, { status: 204 });
  });
}
