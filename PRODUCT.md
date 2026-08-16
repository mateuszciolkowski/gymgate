# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Osoby trenujące siłowo (od amatorów po zaawansowanych bywalców siłowni), które potrzebują szybkiego, bezproblemowego rejestrowania serii, ciężarów, powtórzeń i notatek bezpośrednio podczas przerw między seriami na sali treningowej, często w warunkach słabego lub braku zasięgu sieci.

## Product Purpose

GymGate to platforma webowa do inteligentnego śledzenia treningów siłowych. Zapewnia natychmiastowe, responsywne logowanie ćwiczeń, automatyczne przeliczanie statystyk osobistych, przenoszenie notatek między treningami oraz elastyczną obsługę planów treningowych. Sukces oznacza maksymalną redukcję tarcia podczas treningu (zero lagów, zero utraty wpisanych danych).

## Positioning

Aplikacja wyróżnia się architekturą **offline-first** z optymistycznymi aktualizacjami UI wspieranymi przez IndexedDB i automatyczną synchronizację w tle po przywróceniu łączności. Mechanizm **carry-over notatek** (`ExercisePendingNote`) automatycznie przypomina ostatnie uwagi do ćwiczenia, a silnik statystyk gwarantuje pełną spójność danych poprzez agregację z zakończonych sesji treningowych.

## Operating Context

- **Środowisko:** Sala treningowa, telefon w dłoni (często spocone lub pokryte magnezją dłonie, pośpiech, krótki czas na wpisanie serii w przerwie między ćwiczeniami).
- **Urządzenia:** Przede wszystkim przeglądarki mobilne na smartfonach (oraz przeglądarki desktopowe do przeglądania historii/statystyk i zarządzania planami).
- **Warunki sieciowe:** Zmienne, niestabilne połączenie (piwniczne siłownie, brak Wi-Fi), wymagające pełnej funkcjonalności offline podczas rejestracji sesji.

## Capabilities and Constraints

- **Zarządzanie treningami:** Cykl życia sesji w stanach `DRAFT` (tylko jedna aktywna sesja robocza per użytkownik) oraz `COMPLETED` (zamknięcie sesji, wyzwalające pełne przeliczenie statystyk).
- **Zarządzanie ćwiczeniami i seriami:** Dodawanie ćwiczeń do sesji, kolejkowanie, edycja ciężaru (Decimal) i liczby powtórzeń per seria, notatki bieżące i historyczne.
- **Plany treningowe:** Tworzenie i realizacja szablonów treningowych (własne, wbudowane, społeczności), dynamiczne podpowiedzi kolejnych ćwiczeń z planu w aktywnej sesji oraz możliwość ich pomijania (`skip`).
- **Synchronizacja i offline:** Klient IndexedDB, generowanie tymczasowych identyfikatorów (`temp_*`) i ich remapowanie po zatwierdzeniu przez API, buforowanie mutacji w kolejce offline.
- **Autentykacja:** Rejestracja i logowanie oparte na JWT w ciasteczku `httpOnly`.

## Brand Commitments

- **Nazwa:** GymGate.
- **Stylistyka:** Czysty, nowoczesny, ciemny motyw (dark mode) o wysokim kontraście, taktylne i czytelne elementy interfejsu (duże przyciski akcji, czytelne pola numeryczne dostosowane do szybkiej obsługi kciukiem).

## Evidence on Hand

- Kompletna implementacja backendu (Express + TypeScript + Prisma + PostgreSQL) oraz frontendu (React 19 + Vite + TypeScript + Tailwind CSS).
- Istniejące modele bazodanowe, testy i struktura modułowa w repozytorium.
- Logotyp i zrzuty ekranu aplikacji w katalogu `other/`.

## Product Principles

1. **Zero tarcia na sali:** Każda interakcja (dodanie serii, zmiana ciężaru, zaznaczenie wykonania) musi być natychmiastowa i wymagać minimalnej liczby dotknięć ekranu.
2. **Niezawodność offline:** Użytkownik nigdy nie może utracić wprowadzonych danych treningowych z powodu zerwanego połączenia sieciowego.
3. **Konsekwentna spójność danych:** Wszystkie kalkulacje postępów i statystyki opierają się na faktycznie ukończonych sesjach bez ryzyka rozjazdu danych.
4. **Czytelność i ergonomia kciuka:** Elementy interfejsu kluczowe podczas treningu muszą być wyraźne, czytelne z odległości i łatwo dostępne jedną ręką.
