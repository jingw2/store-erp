-- AlterEnum
-- Adding PENDING value to WebhookStatus enum.
-- This must be in its own migration (committed before the value can be used as a default).
ALTER TYPE "WebhookStatus" ADD VALUE 'PENDING';
