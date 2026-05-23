# Fix: Layout formularzy edycji w WorkoutDetailScreen

## Cel

Poprawić wygląd i czytelność formularzy edycji treningu (DRAFT i COMPLETED), aby:
- Formularz nie "rozjeżdżał się" na ekranie
- Całość była widoczna bez problemów z layoutem
- Zachować spójność wizualną z resztą aplikacji

## Analiza problemu

Plik: `frontend/src/components/screens/WorkoutDetailScreen.tsx`

### Formularz DRAFT (`isEditingInfo`, linia ~520)
- 3 pola: nazwa, siłownia, data
- Wewnątrz karty z `padding: "18px 20px"`, `rounded-[22px]`
- Problem: inputy mają `padding: 11px 14px` i `borderRadius: 12` — OK, ale brak nagłówka formularza i wizualnej separacji od reszty

### Formularz COMPLETED (`isEditMode`, linia ~665)
- 5 pól: nazwa, siłownia, data, notatki (textarea), czas start/end
- Wewnątrz karty z `padding: "14px 16px"`, `rounded-[18px]`
- Problem: za mały padding karty, za dużo pól w ciasnej przestrzeni, brak wizualnej hierarchii

## Plan zmian (~40 linii zmienionych, 1 plik)

### 1. Formularz COMPLETED — zwiększenie paddingu karty w trybie edycji
- Zmienić padding karty z `14px 16px` na `18px 20px` gdy `isEditMode === true`
- Dodać nagłówek "Edytuj trening" z ikoną nad formularzem

### 2. Formularz COMPLETED — lepsza organizacja pól
- Dodać wizualny separator (border-top) między sekcją "dane podstawowe" (nazwa, siłownia, data) a "notatki" i "czas"
- Zmniejszyć `rows` textarea z 3 na 2 (oszczędność miejsca)
- Pola start/end — dodać label "Czas trwania" nad nimi jako grupę

### 3. Formularz DRAFT — drobne poprawki
- Dodać nagłówek "Edytuj dane" nad formularzem
- Zwiększyć gap między polami z `gap-3` na `gap-3.5`

### 4. Wspólne — przyciski akcji
- Dodać `mt-2` do sekcji przycisków (więcej oddechu)
- Zwiększyć padding przycisków z `py-2.5` na `py-3`

## Pliki do modyfikacji

1. `frontend/src/components/screens/WorkoutDetailScreen.tsx` — jedyny plik

## Ryzyko

- Niskie — zmiany czysto wizualne (CSS/klasy), brak zmian logiki
- Brak wpływu na inne komponenty
