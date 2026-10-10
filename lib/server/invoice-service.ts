import { Prisma } from "@/generated/prisma/client";
import { ApiError, missing, prismaErrorCode } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { workOrderService } from "@/lib/server/work-order-service";

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  workOrderId: true,
  subtotal: true,
  gstAmount: true,
  grandTotal: true,
  createdAt: true,
  workOrder: {
    select: {
      service: true,
      quantity: true,
      unitPrice: true,
      customer: { select: { customerName: true, customerAddress: true, billingAddress: true, email: true } },
    },
  },
} satisfies Prisma.InvoiceSelect;

type InvoiceRecord = Prisma.InvoiceGetPayload<{ select: typeof invoiceSelect }>;

function mapInvoice(record: InvoiceRecord) {
  return {
    id: record.id,
    invoiceNumber: `INV-${String(record.invoiceNumber).padStart(6, "0")}`,
    workOrderId: record.workOrderId,
    customerName: record.workOrder.customer.customerName,
    customerAddress: record.workOrder.customer.customerAddress,
    billingAddress: record.workOrder.customer.billingAddress,
    service: record.workOrder.service,
    quantity: record.workOrder.quantity,
    unitPrice: record.workOrder.unitPrice.toFixed(2),
    subtotal: record.subtotal.toFixed(2),
    gstRate: 9 as const,
    gstAmount: record.gstAmount.toFixed(2),
    grandTotal: record.grandTotal.toFixed(2),
    createdAt: record.createdAt,
  };
}

function amountToCents(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

function centsToAmount(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

async function createOrGetInvoice(workOrderId: string) {
  const source = await workOrderService.findInvoiceSource(workOrderId);
  if (source.status !== "COMPLETED") {
    throw new ApiError(409, "WORK_ORDER_NOT_COMPLETED", "An invoice can only be generated for a completed work order");
  }
  const existing = await prisma.invoice.findUnique({ where: { workOrderId }, select: invoiceSelect });
  if (existing) return { invoice: mapInvoice(existing), created: false };

  const subtotalCents = amountToCents(source.unitPrice) * BigInt(source.quantity);
  const gstCents = (subtotalCents * 9n + 50n) / 100n;
  try {
    const record = await prisma.invoice.create({
      data: {
        workOrder: { connect: { id: workOrderId } },
        subtotal: centsToAmount(subtotalCents),
        gstAmount: centsToAmount(gstCents),
        grandTotal: centsToAmount(subtotalCents + gstCents),
      },
      select: invoiceSelect,
    });
    return { invoice: mapInvoice(record), created: true };
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") {
      const concurrentlyCreated = await prisma.invoice.findUnique({ where: { workOrderId }, select: invoiceSelect });
      if (concurrentlyCreated) return { invoice: mapInvoice(concurrentlyCreated), created: false };
    }
    throw error;
  }
}

export const invoiceService = {
  createOrGet: createOrGetInvoice,

  async list(page: number, pageSize: number) {
    const [records, total] = await Promise.all([
      prisma.invoice.findMany({
        select: invoiceSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count(),
    ]);
    return {
      data: records.map(mapInvoice),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async get(id: string) {
    const record = await prisma.invoice.findUnique({ where: { id }, select: invoiceSelect });
    if (!record) throw missing("INVOICE");
    return mapInvoice(record);
  },

  async send(id: string, idempotencyKey?: string) {
    const record = await prisma.invoice.findUnique({ where: { id }, select: invoiceSelect });
    if (!record) throw missing("INVOICE");

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      throw new ApiError(503, "EMAIL_SERVICE_NOT_CONFIGURED", "Invoice email delivery is not configured");
    }

    const invoice = mapInvoice(record);
    const fields = [
      ["Invoice Number", invoice.invoiceNumber],
      ["Work Order ID", invoice.workOrderId],
      ["Customer Name", invoice.customerName],
      ["Customer Address", invoice.customerAddress],
      ["Billing Address", invoice.billingAddress],
      ["Service", invoice.service],
      ["Quantity", String(invoice.quantity)],
      ["Unit Price", `₹${invoice.unitPrice}`],
      ["Subtotal", `₹${invoice.subtotal}`],
      [`GST (${invoice.gstRate}%)`, `₹${invoice.gstAmount}`],
      ["Grand Total", `₹${invoice.grandTotal}`],
    ] as const;
    const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]!);

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from,
          to: [record.workOrder.customer.email],
          subject: `Invoice ${invoice.invoiceNumber}`,
          html: `<h1>Invoice ${escapeHtml(invoice.invoiceNumber)}</h1><table><tbody>${fields.map(([label, value]) => `<tr><th style="text-align:left;padding:6px">${escapeHtml(label)}</th><td style="padding:6px">${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>`,
          text: fields.map(([label, value]) => `${label}: ${value}`).join("\n"),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error("Resend request failed", { cause: error instanceof Error ? error.name : "UnknownError" });
      throw new ApiError(502, "EMAIL_DELIVERY_FAILED", "Invoice email could not be sent");
    }

    if (!response.ok) {
      const provider = await response.json().catch(() => null) as { name?: unknown; message?: unknown } | null;
      const providerMessage = typeof provider?.message === "string"
        ? provider.message.slice(0, 500).replaceAll(apiKey, "[redacted]").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
        : "No provider message";
      const providerDetails = {
        status: response.status,
        code: typeof provider?.name === "string" ? provider.name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "UnknownProviderError",
        message: providerMessage,
      };
      console.error("Resend rejected invoice email", providerDetails);
      throw new ApiError(502, "EMAIL_DELIVERY_FAILED", "Invoice email could not be sent. Check the backend logs for the provider rejection reason.", { provider: providerDetails });
    }

    const body = await response.json().catch(() => null) as { id?: unknown } | null;
    if (typeof body?.id !== "string") throw new ApiError(502, "EMAIL_DELIVERY_FAILED", "Invoice email could not be sent");
    return { invoiceNumber: invoice.invoiceNumber, sentTo: record.workOrder.customer.email, emailId: body.id };
  },
};
