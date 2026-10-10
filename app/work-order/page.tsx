"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ClipboardList, Plus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Customer {
  id: string;
  customerName: string;
  customerAddress: string;
  billingAddress: string;
}

interface PageResult<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface WorkOrderForm {
  customerId: string;
  service: string;
  quantity: string;
  unitPrice: string;
  serviceAddress: string;
  billingAddress: string;
  serviceDate: string;
}

const emptyForm: WorkOrderForm = {
  customerId: "",
  service: "",
  quantity: "1",
  unitPrice: "",
  serviceAddress: "",
  billingAddress: "",
  serviceDate: "",
};

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [completingId, setCompletingId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<WorkOrderForm>(emptyForm);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    fetch(`/api/work-orders?page=${page}&pageSize=20`, { cache: "no-store", signal: controller.signal })
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

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customers", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<{ data: Customer[] }>;
      })
      .then((result) => setCustomers(result.data))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCustomerError(error instanceof Error ? error.message : "Unable to load customers.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCustomersLoading(false);
      });
    return () => controller.abort();
  }, []);

  const estimatedTotal = useMemo(() => {
    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);
    return Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0;
  }, [form.quantity, form.unitPrice]);

  const refreshOrders = useCallback(() => setRefreshKey((key) => key + 1), []);

  async function createWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setFormError("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/work-orders` , {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: form.customerId,
          service: form.service,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          serviceAddress: form.serviceAddress,
          billingAddress: form.billingAddress,
          serviceDate: form.serviceDate,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setForm(emptyForm);
      setCreateOpen(false);
      setPage(1);
      refreshOrders();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create the work order.");
    } finally {
      setCreating(false);
    }
  }

  async function markComplete(id: string) {
    setCompletingId(id);
    setActionError("");
    setActionNotice("");
    try {
      const response = await fetch(`/api/work-orders/${encodeURIComponent(id)}/status`, {
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
      const response = await fetch(`/api/work-orders/${encodeURIComponent(id)}/invoice`, { method: "POST" });
      if (!response.ok) throw new Error(await responseMessage(response));
      const result = await response.json() as { data: { invoiceNumber: string } };
      setActionNotice(`Invoice ${result.data.invoiceNumber} is ready.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to generate the invoice.");
    } finally {
      setCompletingId("");
    }
  }

  function updateCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm((current) => ({
      ...current,
      customerId,
      serviceAddress: customer?.customerAddress ?? "",
      billingAddress: customer?.billingAddress ?? "",
    }));
  }

  const inputClass = "h-10 rounded-lg";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and track scheduled customer work.</p>
        </div>
        <Button onClick={() => { setCreateOpen((open) => !open); setFormError(""); }}>
          <Plus aria-hidden="true" />
          {createOpen ? "Close" : "Create work order"}
        </Button>
      </header>

      {createOpen && (
        <section className="rounded-xl border bg-card p-5 shadow-sm md:p-6" aria-labelledby="create-title">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 id="create-title" className="text-lg font-semibold">New work order</h2>
              <p className="text-sm text-muted-foreground">New work orders start with Pending status.</p>
            </div>
          </div>
          <form onSubmit={createWorkOrder} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-2 text-sm font-medium">
                Customer <span className="text-destructive">*</span>
                <select
                  required
                  className={`${inputClass} w-full border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  value={form.customerId}
                  onChange={(event) => updateCustomer(event.target.value)}
                  disabled={customersLoading || customers.length === 0}
                >
                  <option value="">{customersLoading ? "Loading customers…" : "Select a customer"}</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerName}</option>)}
                </select>
                {customerError && <span className="block text-xs font-normal text-destructive">{customerError}</span>}
                {!customersLoading && !customerError && customers.length === 0 && (
                  <span className="block text-xs font-normal text-muted-foreground">Add a customer before creating a work order.</span>
                )}
              </label>
              <label className="space-y-2 text-sm font-medium">
                Service <span className="text-destructive">*</span>
                <Input className={inputClass} required maxLength={250} value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} placeholder="e.g. HVAC maintenance" />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Service date <span className="text-destructive">*</span>
                <Input className={inputClass} type="date" required value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Quantity <span className="text-destructive">*</span>
                <Input className={inputClass} type="number" required min={1} max={1000000} step={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Unit price <span className="text-destructive">*</span>
                <Input className={inputClass} type="number" required min={0} max={999999999.99} step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} placeholder="0.00" />
              </label>
              <div className="flex items-end rounded-lg border bg-muted/40 px-4 py-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated total</p>
                  <p className="font-semibold tabular-nums">{formatMoney(estimatedTotal)}</p>
                </div>
              </div>
              <label className="space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-3">
                Service address <span className="text-destructive">*</span>
                <Input className={inputClass} required maxLength={500} value={form.serviceAddress} onChange={(event) => setForm({ ...form, serviceAddress: event.target.value })} placeholder="Service location" />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-3">
                Billing address <span className="text-destructive">*</span>
                <Input className={inputClass} required maxLength={500} value={form.billingAddress} onChange={(event) => setForm({ ...form, billingAddress: event.target.value })} placeholder="Billing address" />
              </label>
            </div>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating || customers.length === 0}>
                {creating ? "Creating…" : "Create work order"}
              </Button>
            </div>
          </form>
        </section>
      )}

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
