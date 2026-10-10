import { Prisma } from "@/generated/prisma/client";
import { ApiError, missing, prismaErrorCode } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import type { createWorkOrderSchema } from "@/lib/server/schemas";
import type { z } from "zod";

type CreateInput = z.infer<typeof createWorkOrderSchema>;

const workOrderSelect = {
  id: true,
  customerId: true,
  service: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  serviceAddress: true,
  billingAddress: true,
  serviceDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { customerName: true, email: true } },
} satisfies Prisma.WorkOrderSelect;

function price(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

function serialize(record: Prisma.WorkOrderGetPayload<{ select: typeof workOrderSelect }>) {
  return {
    id: record.id,
    customerId: record.customerId,
    customerName: record.customer.customerName,
    customerEmail: record.customer.email,
    service: record.service,
    quantity: record.quantity,
    unitPrice: record.unitPrice.toFixed(2),
    totalAmount: record.totalAmount.toFixed(2),
    serviceAddress: record.serviceAddress,
    billingAddress: record.billingAddress,
    serviceDate: record.serviceDate.toISOString().slice(0, 10),
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const workOrderService = {
  async create(input: CreateInput) {
    const unitPriceCents = BigInt(Math.round(input.unitPrice * 100));
    const totalAmountCents = unitPriceCents * BigInt(input.quantity);
    try {
      const record = await prisma.workOrder.create({
        data: {
          customer: { connect: { id: input.customerId } },
          service: input.service,
          quantity: input.quantity,
          unitPrice: price(unitPriceCents),
          totalAmount: price(totalAmountCents),
          serviceAddress: input.serviceAddress,
          billingAddress: input.billingAddress,
          serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`),
          status: input.status,
        },
        select: workOrderSelect,
      });
      return serialize(record);
    } catch (error) {
      if (["P2025", "P2003"].includes(prismaErrorCode(error) ?? "")) {
        throw new ApiError(404, "WORK_ORDER_CUSTOMER_NOT_FOUND", "Selected customer not found");
      }
      throw error;
    }
  },

  async list(page: number, pageSize: number) {
    const [records, total] = await Promise.all([
      prisma.workOrder.findMany({
        select: { id: true, service: true, serviceDate: true, totalAmount: true, status: true, customer: { select: { customerName: true } } },
        orderBy: [{ serviceDate: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workOrder.count(),
    ]);
    const data = records.map((record) => ({
      id: record.id,
      customerName: record.customer.customerName,
      service: record.service,
      serviceDate: record.serviceDate.toISOString().slice(0, 10),
      totalAmount: record.totalAmount.toFixed(2),
      status: record.status,
    }));
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  async complete(id: string) {
    try {
      const record = await prisma.workOrder.update({ where: { id }, data: { status: "COMPLETED" }, select: workOrderSelect });
      return serialize(record);
    } catch (error) {
      if (prismaErrorCode(error) === "P2025") throw missing("WORK_ORDER");
      throw error;
    }
  },

  async findInvoiceSource(id: string) {
    const record = await prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        service: true,
        quantity: true,
        unitPrice: true,
        customer: { select: { customerName: true, customerAddress: true, billingAddress: true } },
      },
    });
    if (!record) throw missing("WORK_ORDER");
    return {
      id: record.id,
      status: record.status,
      service: record.service,
      quantity: record.quantity,
      unitPrice: record.unitPrice.toFixed(2),
      customerName: record.customer.customerName,
      customerAddress: record.customer.customerAddress,
      billingAddress: record.customer.billingAddress,
    };
  },
};
