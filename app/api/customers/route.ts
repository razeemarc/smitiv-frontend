import { customerService } from "@/lib/server/customer-service";
import { withApiErrors } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET() {
  return withApiErrors(async () => Response.json({ data: await customerService.listAllForCustomerPicker() }));
}
