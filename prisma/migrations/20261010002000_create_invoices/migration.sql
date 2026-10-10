CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" SERIAL NOT NULL,
    "work_order_id" UUID NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "gst_amount" DECIMAL(18,2) NOT NULL,
    "grand_total" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoices_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_subtotal_nonnegative" CHECK ("subtotal" >= 0),
    CONSTRAINT "invoices_gst_matches_nine_percent" CHECK ("gst_amount" = ROUND("subtotal" * 0.09, 2)),
    CONSTRAINT "invoices_grand_total_matches_subtotal_and_gst" CHECK ("grand_total" = "subtotal" + "gst_amount")
);

CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE UNIQUE INDEX "invoices_work_order_id_key" ON "invoices"("work_order_id");
