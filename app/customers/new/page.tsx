"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomerForm {
  customerName: string;
  email: string;
  phoneNumber: string;
  customerAddress: string;
  billingAddress: string;
}

const emptyForm: CustomerForm = { customerName: "", email: "", phoneNumber: "", customerAddress: "", billingAddress: "" };

async function responseMessage(response: Response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function CreateCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      router.push("/customers");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the customer.");
    } finally {
      setCreating(false);
    }
  }

  const inputClass = "h-10 rounded-lg";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8">
      <header>
        <Button variant="ghost" className="mb-3 -ml-3" onClick={() => router.push("/customers")}>
          <ArrowLeft aria-hidden="true" /> Customers
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the customer’s contact and address details.</p>
      </header>
      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-5 shadow-sm md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">Customer name <span className="text-destructive">*</span>
            <Input className={inputClass} required maxLength={150} value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-medium">Email <span className="text-destructive">*</span>
            <Input className={inputClass} type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Phone number <span className="text-destructive">*</span>
            <Input className={inputClass} type="tel" required minLength={7} maxLength={30} value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Customer address <span className="text-destructive">*</span>
            <Input className={inputClass} required maxLength={500} value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">Billing address <span className="text-destructive">*</span>
            <Input className={inputClass} required maxLength={500} value={form.billingAddress} onChange={(event) => setForm({ ...form, billingAddress: event.target.value })} />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => router.push("/customers")} disabled={creating}>Cancel</Button>
          <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create customer"}</Button>
        </div>
      </form>
    </main>
  );
}
