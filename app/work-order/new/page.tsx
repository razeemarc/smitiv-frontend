"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Customer {
  id: string;
  customerName: string;
  customerAddress: string;
  billingAddress: string;
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

const emptyForm: WorkOrderForm = { customerId: "", service: "", quantity: "1", unitPrice: "", serviceAddress: "", billingAddress: "", serviceDate: "" };

async function responseMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function formatMoney(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerError, setCustomerError] = useState("");
  const [form, setForm] = useState<WorkOrderForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customers", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<{ data: Customer[] }>;
      })
      .then((result) => setCustomers(result.data))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setCustomerError(cause instanceof Error ? cause.message : "Unable to load customers.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCustomersLoading(false);
      });
    return () => controller.abort();
  }, []);

  const total = useMemo(() => Number(form.quantity) * Number(form.unitPrice) || 0, [form.quantity, form.unitPrice]);

  function updateCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm((current) => ({ ...current, customerId, serviceAddress: customer?.customerAddress ?? "", billingAddress: customer?.billingAddress ?? "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setFormError("");
    try {
      const response = await fetch("/api/v1/work-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      router.push("/work-order");
      router.refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create the work order.");
    } finally {
      setCreating(false);
    }
  }

  const inputClass = "h-10 rounded-lg";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 md:px-8">
      <header>
        <Button variant="ghost" className="mb-3 -ml-3" onClick={() => router.push("/work-order")}>
          <ArrowLeft aria-hidden="true" /> Work orders
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Create work order</h1>
        <p className="mt-1 text-sm text-muted-foreground">New work orders start with Pending status.</p>
      </header>
      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-5 shadow-sm md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2 text-sm font-medium">Customer <span className="text-destructive">*</span>
            <select required className={`${inputClass} w-full border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring`} value={form.customerId} onChange={(event) => updateCustomer(event.target.value)} disabled={customersLoading || customers.length === 0}>
              <option value="">{customersLoading ? "Loading customers…" : "Select a customer"}</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerName}</option>)}
            </select>
            {customerError && <span className="block text-xs font-normal text-destructive">{customerError}</span>}
            {!customersLoading && !customerError && customers.length === 0 && <span className="block text-xs font-normal text-muted-foreground">Add a customer before creating a work order.</span>}
          </label>
          <label className="space-y-2 text-sm font-medium">Service <span className="text-destructive">*</span>
            <Input className={inputClass} required maxLength={250} value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} placeholder="e.g. HVAC maintenance" />
          </label>
          <label className="space-y-2 text-sm font-medium">Service date <span className="text-destructive">*</span>
            <Input className={inputClass} type="date" required value={form.serviceDate} onChange={(event) => setForm({ ...form, serviceDate: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-medium">Quantity <span className="text-destructive">*</span>
            <Input className={inputClass} type="number" required min={1} max={1000000} step={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-medium">Unit price <span className="text-destructive">*</span>
            <Input className={inputClass} type="number" required min={0} max={999999999.99} step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} placeholder="0.00" />
          </label>
          <div className="flex items-end rounded-lg border bg-muted/40 px-4 py-2.5">
            <div><p className="text-xs text-muted-foreground">Estimated total</p><p className="font-semibold tabular-nums">{formatMoney(total)}</p></div>
          </div>
          <label className="space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-3">Service address <span className="text-destructive">*</span>
            <Input className={inputClass} required maxLength={500} value={form.serviceAddress} onChange={(event) => setForm({ ...form, serviceAddress: event.target.value })} placeholder="Service location" />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-3">Billing address <span className="text-destructive">*</span>
            <Input className={inputClass} required maxLength={500} value={form.billingAddress} onChange={(event) => setForm({ ...form, billingAddress: event.target.value })} placeholder="Billing address" />
          </label>
        </div>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => router.push("/work-order")} disabled={creating}>Cancel</Button>
          <Button type="submit" disabled={creating || customersLoading || customers.length === 0}>{creating ? "Creating…" : "Create work order"}</Button>
        </div>
      </form>
    </main>
  );
}
