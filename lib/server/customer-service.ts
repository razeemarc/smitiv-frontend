import { Prisma } from "@/generated/prisma/client";
import { ApiError, missing, prismaErrorCode } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import type { createCustomerSchema, updateCustomerSchema } from "@/lib/server/schemas";
import type { z } from "zod";

const customerSelect = {
  id: true,
  customerName: true,
  email: true,
  phoneNumber: true,
  customerAddress: true,
  billingAddress: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerService = {
  create(input: CreateCustomerInput) {
    return prisma.customer.create({ data: input, select: customerSelect });
  },

  async list(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        select: customerSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count(),
    ]);
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  async listAllForCustomerPicker() {
    return prisma.customer.findMany({ select: { id: true, customerName: true, customerAddress: true, billingAddress: true }, orderBy: { customerName: "asc" } });
  },

  async get(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id }, select: customerSelect });
    if (!customer) throw missing("CUSTOMER");
    return customer;
  },

  async update(id: string, input: UpdateCustomerInput) {
    try {
      return await prisma.customer.update({ where: { id }, data: input, select: customerSelect });
    } catch (error) {
      if (prismaErrorCode(error) === "P2025") throw missing("CUSTOMER");
      throw error;
    }
  },

  async delete(id: string) {
    try {
      await prisma.customer.delete({ where: { id } });
    } catch (error) {
      if (prismaErrorCode(error) === "P2025") throw missing("CUSTOMER");
      if (prismaErrorCode(error) === "P2003") {
        throw new ApiError(409, "CUSTOMER_HAS_WORK_ORDERS", "Customer cannot be deleted while work orders are linked to it");
      }
      throw error;
    }
  },
};
