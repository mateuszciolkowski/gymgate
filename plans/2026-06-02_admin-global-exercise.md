# Plan: Admin – tworzenie globalnych ćwiczeń

## Cel
Admin może przy tworzeniu ćwiczenia włączyć toggle "Dodaj dla wszystkich". Wtedy ćwiczenie trafia do bazy z `creatorUserId: null` (globalne, widoczne dla wszystkich). Toggle widoczny tylko dla adminów.

## Zakres zmian

### Backend

1. **`prisma/schema.prisma`**
   - Dodać `isAdmin Boolean @default(false)` do modelu `User`
   - Nowa migracja: `prisma migrate dev --name add_user_is_admin`

2. **`backend/src/modules/auth/auth.service.ts`**
   - `register`: dodać `isAdmin: user.isAdmin` do JWT payload
   - `login`: to samo
   - `verifyToken` / `getUserFromToken`: typ `{ userId, email, isAdmin }`

3. **`backend/src/common/middleware/auth.ts`**
   - `AuthRequest`: dodać `userIsAdmin?: boolean`
   - `decoded` type: dodać `isAdmin?: boolean`
   - `req.userIsAdmin = decoded.isAdmin ?? false`

4. **`backend/src/modules/exercise/exercise.schema.ts`**
   - `createExerciseSchema.body`: dodać `isGlobal: z.boolean().optional()`
   - Zaktualizować typ `CreateExerciseDto`

5. **`backend/src/modules/exercise/exercise.controller.ts`** (`create`)
   - Jeśli `req.body.isGlobal === true` i `!req.userIsAdmin` → `403 Forbidden`
   - Przekazać `isGlobal` do service/repository

6. **`backend/src/modules/exercise/exercise.service.ts`**
   - `createExercise(data: CreateExerciseDto & { isGlobal?: boolean })` → przekazać do repo

7. **`backend/src/modules/exercise/exercise.repository.ts`** (`create`)
   - Jeśli `isGlobal=true` → `creatorUserId: null`
   - W przeciwnym razie bez zmian (`userId || "1"`)

### Frontend

8. **`frontend/src/contexts/AuthContext.tsx`**
   - `User` interface: dodać `isAdmin: boolean`

9. **`frontend/src/contexts/DataContext.tsx`** (`createExercise`)
   - Parametr: dodać `isGlobal?: boolean`
   - Przekazać `isGlobal` w body do `POST /api/exercises`
   - Offline fallback: `creatorUserId: isGlobal ? null : user.id`

10. **`frontend/src/components/screens/AddExerciseScreen.tsx`**
    - Props: `isAdmin?: boolean`, `onAddExercise` — dodać `isGlobal?: boolean` do danych
    - Stan: `const [isGlobal, setIsGlobal] = useState(false)`
    - Toggle widoczny tylko gdy `isAdmin === true`
    - Toggle: przełącznik z etykietą "Dodaj dla wszystkich użytkowników"

11. **`frontend/src/App.tsx`**
    - Przekazać `isAdmin={user?.isAdmin}` do `<AddExerciseScreen>`
    - `onAddExercise={(data) => createExercise(data)}` — `data` już zawiera `isGlobal`

## Co NIE zmienia się
- Edytowanie/usuwanie globalnych ćwiczeń (pozostaje bez zmian)
- Widoczność ćwiczeń (filtrowanie po `creatorUserId: null | "1" | userId`)
- Testy: dodać 2 przypadki do `exercise.service.test.ts` (admin+isGlobal, nie-admin+isGlobal)

## Kolejność implementacji
1. Migracja DB
2. Backend (auth → middleware → exercise)
3. Frontend (AuthContext → DataContext → AddExerciseScreen → App)
4. Testy
5. Docs update
