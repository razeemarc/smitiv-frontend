CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "service" VARCHAR(250) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(11,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "service_address" VARCHAR(500) NOT NULL,
    "billing_address" VARCHAR(500) NOT NULL,
    "service_date" DATE NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_orders_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "work_orders_unit_price_nonnegative" CHECK ("unit_price" >= 0),
    CONSTRAINT "work_orders_total_amount_nonnegative" CHECK ("total_amount" >= 0),
    CONSTRAINT "work_orders_total_matches_quantity_and_price" CHECK ("total_amount" = "quantity" * "unit_price")
);

CREATE INDEX "work_orders_customer_id_created_at_idx" ON "work_orders"("customer_id", "created_at" DESC);
CREATE INDEX "work_orders_service_date_status_idx" ON "work_orders"("service_date", "status");
