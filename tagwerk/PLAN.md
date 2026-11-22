# Tagwerk – Plan

Checklist nach Phasen (Spezifikation: Abschnitt 14).

## Phase 1 – Fundament
- [x] Expo-Projekt (SDK 58), TypeScript strict
- [x] ESLint, Prettier, Jest (`npm test` = tsc + jest)
- [ ] expo-router mit 5 Tabs, Theme, Fonts
- [ ] SQLite + Drizzle + erste Migration
- [ ] Demo-Datengenerator + 5 Szenarien
- [ ] README-Grundgerüst

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
- [ ] Home: EnergyCurve (Scrubbing), DebtGauge, Tipps, letzte Nacht
- [ ] Schlaf-Tab mit Charts
- [ ] Tagesplan-Timeline
- [ ] Night-Detail inkl. Bearbeiten

## Phase 4 – Echte Daten & Onboarding
- [ ] HealthProvider (iOS/Android/Mock), 90-Tage-Import, Sync
- [ ] Manuelle Eingabe
- [ ] Onboarding mit Ergebnis-Reveal

## Phase 5 – Gewohnheiten, Benachrichtigungen, Kalender, Wissen
- [ ] Habits + Logs + Heatmap
- [ ] Lokale Benachrichtigungen + Neuplanung
- [ ] Kalender-Overlay
- [ ] Wissensbibliothek, Tools, Einstellungen, Export/Import

## Phase 6 – Feinschliff
- [ ] Light Mode, i18n EN, Barrierefreiheit
- [ ] Sanfter Wecker, Widgets (To-do dokumentiert)
- [ ] Abschlusstest gegen Akzeptanzkriterien
