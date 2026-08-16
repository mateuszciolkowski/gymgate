-- Kolumna "shortName" istniała już w schema.prisma i na produkcji (dodana
-- bezpośrednio na bazie, bez migracji). Ta migracja domyka historię migracji
-- tak, by odpowiadała rzeczywistemu schematowi.
--
-- IF NOT EXISTS: kolumna może już istnieć (prod, dev po ręcznym backfillu)
-- albo nie (świeża baza) — migracja jest bezpieczna w obu przypadkach.

-- AlterTable
ALTER TABLE "workout_plans" ADD COLUMN IF NOT EXISTS "shortName" TEXT;
