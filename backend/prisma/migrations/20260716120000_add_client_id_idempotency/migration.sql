-- Idempotencja operacji create w offline-sync (retry po timeout/utracie odpowiedzi
-- nie może tworzyć duplikatów treningów / ćwiczeń w treningu / serii).
--
-- Dodajemy nullable "clientId" wygenerowany po stronie klienta i unikalny klucz
-- złożony (scope + clientId). Kolumny są NULL na wszystkich istniejących wierszach —
-- brak backfillu, migracja jest czysto addytywna i bezpieczna na produkcji.
-- W Postgresie NULL nie koliduje z innymi wartościami NULL w unique constraint,
-- więc istniejące wiersze (clientId = NULL) nie wpływają na unikalność.

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN "clientId" TEXT;

-- AlterTable
ALTER TABLE "workout_items" ADD COLUMN "clientId" TEXT;

-- AlterTable
ALTER TABLE "workout_sets" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "workouts_userId_clientId_key" ON "workouts"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_items_workoutId_clientId_key" ON "workout_items"("workoutId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_sets_itemId_clientId_key" ON "workout_sets"("itemId", "clientId");
