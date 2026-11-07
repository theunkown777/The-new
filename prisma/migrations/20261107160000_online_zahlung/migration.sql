-- Online-Zahlung über das eigene Stripe-Konto der Praxis (Stripe Connect)
ALTER TABLE "Practice" ADD COLUMN "stripeAccountId" TEXT;
CREATE UNIQUE INDEX "Practice_stripeAccountId_key" ON "Practice"("stripeAccountId");
ALTER TABLE "Invoice" ADD COLUMN "paidVia" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripeSessionId" TEXT;
CREATE UNIQUE INDEX "Invoice_stripeSessionId_key" ON "Invoice"("stripeSessionId");
