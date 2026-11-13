-- Sitzungen widerrufbar, 2FA-Wechsel erst nach Bestätigung, Einladung nur per Mail bestätigt
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totpPendingSecret" TEXT;
ALTER TABLE "StaffInvite" ADD COLUMN "mailed" BOOLEAN NOT NULL DEFAULT false;
