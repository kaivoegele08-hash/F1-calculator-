# Tagwerk – Plan

Checklist nach Phasen (Spezifikation: Abschnitt 14).

## Phase 1 – Fundament
- [x] Expo-Projekt (SDK 58), TypeScript strict
- [x] ESLint, Prettier, Jest (`npm test` = tsc + jest)
- [x] expo-router mit 5 Tabs, Theme, Fonts
- [x] SQLite + Drizzle + erste Migration
- [x] Demo-Datengenerator + 5 Szenarien
- [x] README-Grundgerüst

## Phase 2 – Engine
- [x] Konstanten, Typen, Zeit-Hilfen (DST-sicher)
- [x] Schlaftag-Zuordnung, Merge, Naps, Quellen-Priorität
- [x] Schlafbedarf, Schlafschuld (+ Prognose)
- [x] Zwei-Prozess-Modell, Schlafträgheit, Schichtmodus/Jetlag
- [x] Energiekurve, Fenster, Schlafenszeit
- [x] Chronotyp (Fragebogen + Lernen)
- [x] Empfehlungen
- [x] Tests (> 90 % Zeilenabdeckung), Benchmark

## Phase 3 – Kern-UI
- [x] Home: EnergyCurve (Scrubbing), DebtGauge, Tipps, letzte Nacht
- [x] Schlaf-Tab mit Charts
- [x] Tagesplan-Timeline
- [x] Night-Detail inkl. Bearbeiten

## Phase 4 – Echte Daten & Onboarding
- [x] HealthProvider (iOS/Android/Mock), 90-Tage-Import, Sync
- [x] Manuelle Eingabe
- [x] Onboarding mit Ergebnis-Reveal

## Phase 5 – Gewohnheiten, Benachrichtigungen, Kalender, Wissen
- [x] Habits + Logs + Heatmap
- [x] Lokale Benachrichtigungen + Neuplanung
- [x] Kalender-Overlay
- [x] Wissensbibliothek, Tools, Einstellungen, Export/Import

## Phase 6 – Feinschliff
- [x] Light Mode, i18n EN, Barrierefreiheit
- [x] Sanfter Wecker, Widgets (To-do dokumentiert)
- [x] Abschlusstest gegen Akzeptanzkriterien
