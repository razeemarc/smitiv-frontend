"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Customer {
  id: string;
  customerName: string;
  email: string;
  phoneNumber: string;
  customerAddress: string;
  billingAddress: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerForm {
  customerName: string;
  email: string;
  phoneNumber: string;
  customerAddress: string;
  billingAddress: string;
}

interface CustomerPage {
  data: Customer[];
  pagination: { total: number; totalPages: number };
}

const emptyForm: CustomerForm = {
  customerName: "",
  email: "",
  phoneNumber: "",
  customerAddress: "",
  billingAddress: "",
};

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseMessage(response));
        return response.json() as Promise<{ data: Customer[] }>;
      })
      .then((result) => setCustomers(result.data))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(error instanceof Error ? error.message : "Unable to load customers.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.customerName, customer.email, customer.phoneNumber, customer.customerAddress, customer.billingAddress]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [customers, search]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setFormError("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const result = await response.json() as { data: Customer };
      setCustomers((current) => [result.data, ...current]);
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create the customer.");
    } finally {
      setCreating(false);
    }
  }

  const inputClass = "h-10 rounded-lg";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your customers and their contact and address details.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden="true" /> Add customer
        </Button>
      </header>

      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input type="search" aria-label="Search customers" placeholder="Search customers" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {listError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{listError}</span>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} /> Retry
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm" aria-label="Customer list">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">All customers</h2>
            <p className="text-sm text-muted-foreground">{customers.length} total</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} aria-label="Refresh customers">
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Customer address</TableHead>
              <TableHead>Billing address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Loading customers…</TableCell></TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="size-6" aria-hidden="true" />
                    <p>{listError ? "Customers could not be loaded." : customers.length === 0 ? "No customers yet. Add one to get started." : `No customers match “${search}”.`}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : visible.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.customerName}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phoneNumber}</TableCell>
                <TableCell>{customer.customerAddress}</TableCell>
                <TableCell>{customer.billingAddress}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => !creating && setDialogOpen(open)}>
        <DialogContent>
          <form onSubmit={createCustomer} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
              <DialogDescription>Enter the customer details. All fields are required.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Customer name <span className="text-destructive">*</span>
                <Input className={inputClass} required maxLength={150} value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Email <span className="text-destructive">*</span>
                <Input className={inputClass} type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Phone number <span className="text-destructive">*</span>
                <Input className={inputClass} type="tel" required minLength={7} maxLength={30} value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Customer address <span className="text-destructive">*</span>
                <Input className={inputClass} required maxLength={500} value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">
                Billing address <span className="text-destructive">*</span>
                <Input className={inputClass} required maxLength={500} value={form.billingAddress} onChange={(event) => setForm({ ...form, billingAddress: event.target.value })} />
              </label>
            </div>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create customer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
