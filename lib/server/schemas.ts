import { z } from "zod";

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);
const phoneNumber = z.string().trim()
  .regex(/^[+()\-\s.0-9]+$/, "Phone number contains unsupported characters")
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 20;
  }, "Phone number must contain between 7 and 20 digits");

export const createCustomerSchema = z.object({
  customerName: nonEmptyText(150),
  email: z.string().trim().email().max(254),
  phoneNumber,
  customerAddress: nonEmptyText(500),
  billingAddress: nonEmptyText(500),
}).strict();

export const updateCustomerSchema = createCustomerSchema.partial().strict()
  .refine((value) => Object.keys(value).length > 0, "At least one customer field must be provided");

const paginationShape = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
};
export const listQuerySchema = z.object(paginationShape).strict();
export const uuidSchema = z.string().uuid();

export const workOrderStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const createWorkOrderSchema = z.object({
  customerId: z.uuid(),
  service: z.string().trim().min(1).max(250),
  quantity: z.number().int().positive().max(1_000_000),
  unitPrice: z.number().finite().min(0).max(999_999_999.99)
    .refine((value) => Number(value.toFixed(2)) === value, "Unit price cannot have more than 2 decimal places"),
  serviceAddress: nonEmptyText(500),
  billingAddress: nonEmptyText(500),
  serviceDate: z.iso.date(),
  status: workOrderStatusSchema.default("PENDING"),
}).strict();
export const completeWorkOrderSchema = z.object({ status: z.literal("COMPLETED") }).strict();
export const invoiceBodySchema = z.object({}).strict().optional();
export const sendInvoiceHeadersSchema = z.object({
  "idempotency-key": z.string().trim().min(1).max(256).optional(),
}).strict();
