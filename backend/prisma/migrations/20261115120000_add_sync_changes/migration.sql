-- Dziennik zmian dla synchronizacji aplikacji mobilnej (mobile/docs/PLAN.md, 6.1).
--
-- Migracja wyłącznie addytywna: nowa tabela + wyzwalacze AFTER na istniejących
-- tabelach. Wyzwalacze tylko dopisują wiersze do "sync_changes"; nie zmieniają
-- ani nie blokują danych, na których pracuje PWA.
--
-- Wycofanie (bez wpływu na dane aplikacji):
--   DROP TRIGGER IF EXISTS gg_sync_workouts ON "workouts";
--   DROP TRIGGER IF EXISTS gg_sync_workout_items ON "workout_items";
--   DROP TRIGGER IF EXISTS gg_sync_workout_sets ON "workout_sets";
--   DROP TRIGGER IF EXISTS gg_sync_exercises ON "exercises";
--   DROP TRIGGER IF EXISTS gg_sync_exercise_photos ON "exercise_photos";
--   DROP TRIGGER IF EXISTS gg_sync_workout_plans ON "workout_plans";
--   DROP TRIGGER IF EXISTS gg_sync_workout_plan_items ON "workout_plan_items";
--   DROP TRIGGER IF EXISTS gg_sync_user_favorite_plans ON "user_favorite_plans";
--   DROP TRIGGER IF EXISTS gg_sync_exercise_pending_notes ON "exercise_pending_notes";
--   DROP TRIGGER IF EXISTS gg_sync_users ON "users";
--   DROP FUNCTION IF EXISTS gg_sync_log_change();
--   DROP FUNCTION IF EXISTS gg_sync_log_plan(TEXT, BOOLEAN, TEXT);
--   DROP FUNCTION IF EXISTS gg_sync_log_exercise(TEXT, TEXT);
--   DROP TABLE IF EXISTS "sync_changes";
--   DELETE FROM "_prisma_migrations" WHERE migration_name = '20261115120000_add_sync_changes';

CREATE TABLE "sync_changes" (
    "seq" BIGSERIAL NOT NULL,
    -- Identyfikator transakcji, która zapisała zmianę. Pobieranie zwraca tylko
    -- wpisy z transakcji starszych niż najstarsza trwająca, więc zmiana
    -- zatwierdzona z opóźnieniem nie zostanie pominięta.
    "txid" BIGINT NOT NULL DEFAULT ((pg_current_xact_id())::text)::bigint,
    -- NULL = zmiana widoczna dla wszystkich (ćwiczenia globalne, plany wbudowane i publiczne).
    "scopeUserId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_changes_pkey" PRIMARY KEY ("seq")
);

CREATE INDEX "sync_changes_scopeUserId_txid_seq_idx" ON "sync_changes"("scopeUserId", "txid", "seq");
CREATE INDEX "sync_changes_createdAt_idx" ON "sync_changes"("createdAt");

-- Ćwiczenie: globalne (twórca NULL lub historyczne '1') widzą wszyscy, prywatne tylko twórca.
CREATE FUNCTION gg_sync_log_exercise(p_id TEXT, p_creator TEXT) RETURNS VOID AS $$
BEGIN
    IF p_creator IS NULL OR p_creator = '1' THEN
        INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (NULL, 'exercise', p_id);
    ELSE
        INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (p_creator, 'exercise', p_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Plan: twórca zawsze; dodatkowo wszyscy, gdy plan jest wbudowany lub publiczny.
CREATE FUNCTION gg_sync_log_plan(p_creator TEXT, p_public BOOLEAN, p_id TEXT) RETURNS VOID AS $$
BEGIN
    IF p_creator IS NOT NULL THEN
        INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (p_creator, 'plan', p_id);
    END IF;
    IF p_creator IS NULL OR p_public THEN
        INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (NULL, 'plan', p_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION gg_sync_log_change() RETURNS TRIGGER AS $$
DECLARE
    v_user TEXT;
    v_creator TEXT;
    v_public BOOLEAN;
BEGIN
    IF TG_TABLE_NAME = 'workouts' THEN
        IF TG_OP = 'DELETE' THEN
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (OLD."userId", 'workout', OLD."id");
        ELSE
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (NEW."userId", 'workout', NEW."id");
        END IF;

    ELSIF TG_TABLE_NAME = 'workout_items' THEN
        -- Gdy pozycja znika kaskadowo razem z treningiem, rodzica już nie ma:
        -- wpisu nie tworzymy, klient odtwarza kaskadę z usunięcia treningu.
        IF TG_OP = 'DELETE' THEN
            SELECT w."userId" INTO v_user FROM "workouts" w WHERE w."id" = OLD."workoutId";
            IF v_user IS NOT NULL THEN
                INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (v_user, 'workoutItem', OLD."id");
            END IF;
        ELSE
            SELECT w."userId" INTO v_user FROM "workouts" w WHERE w."id" = NEW."workoutId";
            IF v_user IS NOT NULL THEN
                INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (v_user, 'workoutItem', NEW."id");
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'workout_sets' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT w."userId" INTO v_user FROM "workout_items" i JOIN "workouts" w ON w."id" = i."workoutId" WHERE i."id" = OLD."itemId";
            IF v_user IS NOT NULL THEN
                INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (v_user, 'workoutSet', OLD."id");
            END IF;
        ELSE
            SELECT w."userId" INTO v_user FROM "workout_items" i JOIN "workouts" w ON w."id" = i."workoutId" WHERE i."id" = NEW."itemId";
            IF v_user IS NOT NULL THEN
                INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (v_user, 'workoutSet', NEW."id");
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'exercises' THEN
        IF TG_OP <> 'INSERT' THEN
            PERFORM gg_sync_log_exercise(OLD."id", OLD."creatorUserId");
        END IF;
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW."creatorUserId" IS DISTINCT FROM OLD."creatorUserId") THEN
            PERFORM gg_sync_log_exercise(NEW."id", NEW."creatorUserId");
        END IF;

    ELSIF TG_TABLE_NAME = 'exercise_photos' THEN
        -- Zdjęcia są częścią ćwiczenia: sygnalizujemy zmianę ćwiczenia.
        IF TG_OP = 'DELETE' THEN
            SELECT e."creatorUserId", TRUE INTO v_creator, v_public FROM "exercises" e WHERE e."id" = OLD."exerciseId";
            IF FOUND THEN
                PERFORM gg_sync_log_exercise(OLD."exerciseId", v_creator);
            END IF;
        ELSE
            SELECT e."creatorUserId", TRUE INTO v_creator, v_public FROM "exercises" e WHERE e."id" = NEW."exerciseId";
            IF FOUND THEN
                PERFORM gg_sync_log_exercise(NEW."exerciseId", v_creator);
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'workout_plans' THEN
        -- Stary i nowy stan: zmiana widoczności (publiczny -> prywatny) musi dotrzeć
        -- także do tych, którzy plan widzieli wcześniej.
        IF TG_OP <> 'INSERT' THEN
            PERFORM gg_sync_log_plan(OLD."creatorUserId", OLD."isPublic", OLD."id");
        END IF;
        IF TG_OP <> 'DELETE' THEN
            PERFORM gg_sync_log_plan(NEW."creatorUserId", NEW."isPublic", NEW."id");
        END IF;

    ELSIF TG_TABLE_NAME = 'workout_plan_items' THEN
        -- Pozycje są częścią planu: sygnalizujemy zmianę planu (jeśli jeszcze istnieje).
        IF TG_OP = 'DELETE' THEN
            SELECT p."creatorUserId", p."isPublic" INTO v_creator, v_public FROM "workout_plans" p WHERE p."id" = OLD."planId";
            IF FOUND THEN
                PERFORM gg_sync_log_plan(v_creator, v_public, OLD."planId");
            END IF;
        ELSE
            SELECT p."creatorUserId", p."isPublic" INTO v_creator, v_public FROM "workout_plans" p WHERE p."id" = NEW."planId";
            IF FOUND THEN
                PERFORM gg_sync_log_plan(v_creator, v_public, NEW."planId");
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'user_favorite_plans' THEN
        -- "Ulubiony" jest polem planu widzianym przez konkretnego użytkownika.
        IF TG_OP = 'DELETE' THEN
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (OLD."userId", 'plan', OLD."planId");
        ELSE
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (NEW."userId", 'plan', NEW."planId");
        END IF;

    ELSIF TG_TABLE_NAME = 'exercise_pending_notes' THEN
        -- Notatka oczekująca jest unikalna per (użytkownik, ćwiczenie): identyfikatorem jest ćwiczenie.
        IF TG_OP = 'DELETE' THEN
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (OLD."userId", 'pendingNote', OLD."exerciseId");
        ELSE
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (NEW."userId", 'pendingNote', NEW."exerciseId");
        END IF;

    ELSIF TG_TABLE_NAME = 'users' THEN
        IF NEW."activeWorkoutId" IS DISTINCT FROM OLD."activeWorkoutId"
           OR NEW."email" IS DISTINCT FROM OLD."email"
           OR NEW."firstName" IS DISTINCT FROM OLD."firstName"
           OR NEW."lastName" IS DISTINCT FROM OLD."lastName"
           OR NEW."phone" IS DISTINCT FROM OLD."phone"
           OR NEW."isAdmin" IS DISTINCT FROM OLD."isAdmin" THEN
            INSERT INTO "sync_changes" ("scopeUserId", "entity", "entityId") VALUES (NEW."id", 'profile', NEW."id");
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gg_sync_workouts AFTER INSERT OR UPDATE OR DELETE ON "workouts"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_workout_items AFTER INSERT OR UPDATE OR DELETE ON "workout_items"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_workout_sets AFTER INSERT OR UPDATE OR DELETE ON "workout_sets"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_exercises AFTER INSERT OR UPDATE OR DELETE ON "exercises"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_exercise_photos AFTER INSERT OR UPDATE OR DELETE ON "exercise_photos"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_workout_plans AFTER INSERT OR UPDATE OR DELETE ON "workout_plans"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_workout_plan_items AFTER INSERT OR UPDATE OR DELETE ON "workout_plan_items"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_user_favorite_plans AFTER INSERT OR UPDATE OR DELETE ON "user_favorite_plans"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_exercise_pending_notes AFTER INSERT OR UPDATE OR DELETE ON "exercise_pending_notes"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
CREATE TRIGGER gg_sync_users AFTER UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION gg_sync_log_change();
