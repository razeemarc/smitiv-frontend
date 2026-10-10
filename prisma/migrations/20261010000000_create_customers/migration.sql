CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customer_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone_number" VARCHAR(30) NOT NULL,
    "customer_address" VARCHAR(500) NOT NULL,
    "billing_address" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
