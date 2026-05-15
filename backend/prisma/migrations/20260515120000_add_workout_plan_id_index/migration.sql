-- Index na FK workouts.workoutPlanId dla zapytań "ile treningów na podstawie planu X"
-- oraz dla optymalizacji JOIN-ów workout <-> workout_plans.
-- IF NOT EXISTS gwarantuje idempotentność (gdyby kiedyś ktoś dodał ręcznie na Supabase).
-- Kolumna jest świeżo dodana i puste/NULL na istniejących wierszach, więc CREATE INDEX
-- jest praktycznie natychmiastowy — brak ryzyka długiego locka.

CREATE INDEX IF NOT EXISTS "workouts_workoutPlanId_idx" ON "workouts"("workoutPlanId");
