"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Eye, FileText, Mail, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  customerName: string;
  customerAddress: string;
  billingAddress: string;
  service: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  gstRate: 9;
  gstAmount: string;
  grandTotal: string;
  createdAt: string;
}

interface PageResult {
  data: Invoice[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const message = body?.error?.message ?? "Something went wrong. Please try again.";
    const provider = body?.error?.provider;
    if (provider?.message && provider.message !== "No provider message") {
      const status = provider.status ? ` (HTTP ${provider.status})` : "";
      return `${message}${status}: ${provider.message}`;
    }
    return message;
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function money(value: string | number): string {
  const amount = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  return `₹${amount}`;
}

function date(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function downloadInvoice(invoice: Invoice) {
  const rows = [
    ["Service", invoice.service],
    ["Quantity", String(invoice.quantity)],
    ["Unit price", money(invoice.unitPrice)],
    ["Subtotal", money(invoice.subtotal)],
    ["GST (9%)", money(invoice.gstAmount)],
    ["Grand total", money(invoice.grandTotal)],
  ];
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    window.alert("Allow pop-ups to download this invoice as a PDF.");
    return;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title>
    <style>@page{size:A4;margin:18mm}body{font:15px Arial,sans-serif;color:#172033;max-width:760px;margin:0 auto}header{display:flex;justify-content:space-between;border-bottom:2px solid #172033;padding-bottom:22px}.muted{color:#667085}.addresses{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:30px 0}table{width:100%;border-collapse:collapse;margin-top:28px}td{padding:13px 8px;border-bottom:1px solid #e5e7eb}td:last-child{text-align:right}tr:last-child{font-weight:bold;font-size:18px}</style></head>
    <body><header><div><h1>Invoice</h1><div>${escapeHtml(invoice.invoiceNumber)}</div></div><div class="muted">Issued ${escapeHtml(date(invoice.createdAt))}<br>Work order ${escapeHtml(invoice.workOrderId)}</div></header>
    <h2>${escapeHtml(invoice.customerName)}</h2><div class="addresses"><div><strong>Customer address</strong><p>${escapeHtml(invoice.customerAddress)}</p></div><div><strong>Billing address</strong><p>${escapeHtml(invoice.billingAddress)}</p></div></div>
    <table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
    <script>window.addEventListener("load",()=>window.print());window.addEventListener("afterprint",()=>window.close());</script></body></html>`;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [viewLoading, setViewLoading] = useState("");
  const [sending, setSending] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invoices?page=${page}&pageSize=20`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorMessage(response));
        return response.json() as Promise<PageResult>;
      })
      .then((result) => {
        setInvoices(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : "Unable to load invoices.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, refreshKey]);

  async function viewInvoice(invoiceId: string) {
    setViewLoading(invoiceId);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invoices/${encodeURIComponent(invoiceId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { data: Invoice };
      setSelected(result.data);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to load this invoice.");
    } finally {
      setViewLoading("");
    }
  }

  async function sendInvoice(invoice: Invoice) {
    setSending(invoice.id);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invoices/${encodeURIComponent(invoice.id)}/send`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { data: { sentTo: string } };
      setNotice(`${invoice.invoiceNumber} sent to ${result.data.sentTo}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to send invoice.");
    } finally {
      setSending("");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">View, send and download invoices for completed work.</p>
        </div>
        <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </header>

      {notice && <p role="status" className="rounded-lg border border-emerald-600/25 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      {actionError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{actionError}</p>}

      {selected && (
        <section className="rounded-xl border bg-card p-5 shadow-sm md:p-6" aria-labelledby="invoice-detail-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><FileText className="size-5 text-muted-foreground" aria-hidden="true" /><h2 id="invoice-detail-title" className="text-lg font-semibold">{selected.invoiceNumber}</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">Issued {date(selected.createdAt)} · Work order {selected.workOrderId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => downloadInvoice(selected)}><Download aria-hidden="true" /> Download PDF</Button>
              <Button variant="outline" onClick={() => void sendInvoice(selected)} disabled={sending === selected.id}><Mail aria-hidden="true" /> {sending === selected.id ? "Sending…" : "Send invoice"}</Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</p><p className="mt-1 font-medium">{selected.customerName}</p><p className="text-sm text-muted-foreground">{selected.customerAddress}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing address</p><p className="mt-1 text-sm">{selected.billingAddress}</p></div>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border">
            <div className="flex justify-between border-b px-4 py-3 text-sm"><span>{selected.service} · Qty {selected.quantity} × {money(selected.unitPrice)}</span><span>{money(selected.subtotal)}</span></div>
            <div className="flex justify-between border-b px-4 py-3 text-sm text-muted-foreground"><span>GST (9%)</span><span>{money(selected.gstAmount)}</span></div>
            <div className="flex justify-between px-4 py-3 font-semibold"><span>Grand total</span><span>{money(selected.grandTotal)}</span></div>
          </div>
        </section>
      )}

      {listError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{listError}</div>}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-label="Invoice list">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">All invoices</h2><p className="text-sm text-muted-foreground">{total} total</p></div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Work order</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Grand total</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Loading invoices…</TableCell></TableRow> : invoices.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-36 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="size-6" aria-hidden="true" /><span>{listError ? "Invoices could not be loaded." : "No invoices yet. Generate an invoice from a completed work order."}</span></div></TableCell></TableRow>
            ) : invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell><div className="font-medium">{invoice.invoiceNumber}</div><Badge variant="secondary" className="mt-1">Issued</Badge></TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell className="font-mono text-xs">{invoice.workOrderId.slice(0, 8)}…</TableCell>
                <TableCell className="whitespace-nowrap">{date(invoice.createdAt)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{money(invoice.grandTotal)}</TableCell>
                <TableCell><div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void viewInvoice(invoice.id)} disabled={viewLoading === invoice.id} aria-label={`View ${invoice.invoiceNumber}`}><Eye aria-hidden="true" />{viewLoading === invoice.id ? "Loading" : "View"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => void sendInvoice(invoice)} disabled={sending === invoice.id} aria-label={`Send ${invoice.invoiceNumber}`}><Mail aria-hidden="true" />{sending === invoice.id ? "Sending" : "Send"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadInvoice(invoice)} aria-label={`Download ${invoice.invoiceNumber} as PDF`}><Download aria-hidden="true" />PDF</Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
          <span>Page {Math.max(1, page)} of {Math.max(1, totalPages)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} aria-label="Previous page"><ArrowLeft aria-hidden="true" /> Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} aria-label="Next page">Next <ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
