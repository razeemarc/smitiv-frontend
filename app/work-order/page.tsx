"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type WorkOrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface WorkOrder {
  id: string;
  customerName: string;
  service: string;
  serviceDate: string;
  totalAmount: string;
  status: WorkOrderStatus;
}

interface PageResult<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function formatMoney(value: string | number): string {
  const amount = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  return `₹${amount}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [completingId, setCompletingId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    fetch(`/api/v1/work-orders?page=${page}&pageSize=20`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<PageResult<WorkOrder>>;
      })
      .then((result) => {
        setWorkOrders(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setListError(error instanceof Error ? error.message : "Unable to load work orders.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, refreshKey]);

  const refreshOrders = useCallback(() => setRefreshKey((key) => key + 1), []);

  async function markComplete(id: string) {
    setCompletingId(id);
    setActionError("");
    setActionNotice("");
    try {
      const response = await fetch(`/api/v1/work-orders/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      refreshOrders();
      const result = await response.json() as { invoice: { invoiceNumber: string } };
      setActionNotice(`Work order completed. Invoice ${result.invoice.invoiceNumber} is ready.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to complete the work order.");
    } finally {
      setCompletingId("");
    }
  }

  async function generateInvoice(id: string) {
    setCompletingId(id);
    setActionError("");
    setActionNotice("");
    try {
      const response = await fetch(`/api/v1/work-orders/${encodeURIComponent(id)}/invoice`, { method: "POST" });
      if (!response.ok) throw new Error(await responseMessage(response));
      const result = await response.json() as { data: { invoiceNumber: string } };
      setActionNotice(`Invoice ${result.data.invoiceNumber} is ready.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to generate the invoice.");
    } finally {
      setCompletingId("");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and track scheduled customer work.</p>
        </div>
        <Button onClick={() => router.push("/work-order/new")}>
          <Plus aria-hidden="true" />
          Create work order
        </Button>
      </header>

      {actionError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{actionError}</p>}
      {actionNotice && <p role="status" className="rounded-lg border border-emerald-600/25 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700">{actionNotice}</p>}
      {listError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{listError}</span>
          <Button variant="outline" size="sm" onClick={refreshOrders}><RefreshCw aria-hidden="true" /> Retry</Button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-label="Work order list">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">All work orders</h2>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshOrders} disabled={loading} aria-label="Refresh work orders">
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Work Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Service date</TableHead>
              <TableHead className="text-right">Total amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-28 text-center text-muted-foreground">Loading work orders…</TableCell></TableRow>
            ) : workOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ClipboardList className="size-6" aria-hidden="true" />
                    <p>{listError ? "Work orders could not be loaded." : "No work orders yet. Create one to get started."}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : workOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs" title={order.id}>{order.id}</TableCell>
                <TableCell className="font-medium">{order.customerName}</TableCell>
                <TableCell>{order.service}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(order.serviceDate)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatMoney(order.totalAmount)}</TableCell>
                <TableCell>
                  <Badge variant={order.status === "COMPLETED" ? "default" : order.status === "CANCELLED" ? "destructive" : "secondary"}>
                    {order.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {order.status === "COMPLETED" ? (
                    <Button size="sm" variant="outline" disabled={completingId === order.id} onClick={() => void generateInvoice(order.id)}>
                      {completingId === order.id ? "Generating…" : "Generate invoice"}
                    </Button>
                  ) : order.status !== "CANCELLED" ? (
                    <Button size="sm" variant="outline" disabled={completingId === order.id} onClick={() => void markComplete(order.id)}>
                      {completingId === order.id ? "Completing…" : "Mark complete"}
                    </Button>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-5 py-3 text-sm text-muted-foreground">
          <span>Page {Math.max(1, page)} of {Math.max(1, totalPages)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} aria-label="Previous page">
              <ArrowLeft aria-hidden="true" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} aria-label="Next page">
              Next <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
