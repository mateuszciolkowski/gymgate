-- Przetworzone operacje synchronizacji (mobile/docs/PLAN.md, 6.2).
-- Migracja wyłącznie addytywna: nowa tabela, bez zmian w istniejących.
--
-- Wycofanie (bez wpływu na dane aplikacji):
--   DROP TABLE IF EXISTS "sync_operations";
--   DELETE FROM "_prisma_migrations" WHERE migration_name = '20261116120000_add_sync_operations';

-- CreateTable
CREATE TABLE "sync_operations" (
    "opId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("opId")
);

-- CreateIndex
CREATE INDEX "sync_operations_userId_createdAt_idx" ON "sync_operations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "sync_operations_createdAt_idx" ON "sync_operations"("createdAt");

-- AddForeignKey
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
