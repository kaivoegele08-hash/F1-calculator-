# Tagwerk

**Schlafschuld runter, Energie rauf.** Eine local-first Schlaf- und Energie-App (Expo / React Native / TypeScript), die auf zwei Dingen aufbaut:

1. **Schlafschuld:** gewichtet über die letzten 14 Nächte, gemessen an deinem persönlichen Schlafbedarf.
2. **Innerer Rhythmus:** Energiekurve des Tages (Benommenheit, Morgenhoch, Nachmittagstief, Abendhoch), Melatonin-Fenster und ideale Schlafenszeit.

> **Kein Medizinprodukt.** Alle Werte sind Schätzungen aus wissenschaftlichen Modellen und ersetzen keine Diagnose. Alle Daten bleiben auf dem Gerät (kein Backend, kein Tracking).

Die Spezifikation, nach der die App gebaut wurde, steht im Prompt zu diesem Projekt (Abschnitte 0–15). Die Abschnittsnummern unten verweisen darauf.

## Setup

```bash
cd tagwerk
npm install            # .npmrc setzt legacy-peer-deps (einige Expo-Peer-Ranges sind enger als die React-19-Versionen)
npm test                 # tsc --noEmit + Jest (Engine, Daten, Services, Komponenten)
npm run lint             # ESLint ohne Warnungen
npx expo start --web     # Web-Vorschau mit Demo-Daten
npx expo start           # Expo Go: alles außer Gesundheitsdaten
```

### Demo-Modus / Web-Vorschau

Im Browser (und überall, wo keine Gesundheitsdaten verfügbar sind) nutzt Tagwerk einen Demo-Datenanbieter. Im Onboarding erzeugt „Verbinden“ dort 90 Nächte Demodaten. Unter **Mehr → Einstellungen → Daten** lassen sich fünf Szenarien laden:
gut ausgeschlafen · Prüfungswoche · Spättyp mit Frühschicht · Wochenend-Nachholer · Schichtarbeiter.
Im Web liegen die Daten in `localStorage`, auf dem Gerät in SQLite.

### Development Build (HealthKit / Health Connect)

HealthKit (`react-native-health`) und Health Connect (`react-native-health-connect`) sind native Module und laufen **nicht in Expo Go**. Dafür ein Development Build:

```bash
# iOS (benötigt macOS + Xcode)
npx expo prebuild --platform ios
npx expo run:ios --device          # echtes iPhone für HealthKit-Daten

# Android (Health Connect muss auf dem Gerät installiert sein, ab Android 14 integriert)
npx expo prebuild --platform android
npx expo run:android --device
```

Oder mit EAS: `eas build --profile development --platform ios|android` und `npx expo start --dev-client`.
Die Config-Plugins in `app.json` setzen HealthKit-Entitlement, Nutzungstexte, Health-Connect-Berechtigung (`READ_SLEEP`) und `minSdkVersion 26`. Beide Prebuilds wurden getestet.
Ohne Wearable schreibt auch ein iPhone Schlafdaten in Apple Health, wenn der „Schlafplan“ genutzt wird.

## Architektur

```
app/                    expo-router: Tabs (Heute, Schlaf, Tagesplan, Gewohnheiten, Mehr), Onboarding, Nacht, Wissen, Tools, Einstellungen
src/engine/             REINE Logik ohne React/Expo (Konstanten zentral in constants.ts, ENGINE_VERSION)
src/data/               Drizzle-Schema, versionierte Migrationen, SqliteStore + MemoryStore (gleiche Schnittstelle), Export/Import (zod), Demo-Generator
src/integrations/       HealthProvider (HealthKit, Health Connect, Mock), Konvertierung von Rohdaten in Sessions
src/services/           Benachrichtigungsplan, Kalender, Sync, Hintergrundaufgabe, Geräusche, Summary-Cache, Widget-Snapshot
src/state/              Zustand-Store und Hooks (useDayPlan, useTips …)
src/ui/                 Theme (dunkel/hell), Komponenten (EnergyCurve, DebtGauge, Charts …)
src/content/            Wissensbibliothek (eigene Texte), Gewohnheiten
src/i18n/               de (vollständig), en (teilweise, Fallback auf de)
```

Die Engine bekommt nur reine Datenobjekte (`SleepSession[]`, `Profile`), Repositories wandeln um. Alle Zeiten sind UTC-Millisekunden, die Anzeige nutzt die Zeitzone aus `profile.timezone`.

## Engine-Formeln (Spezifikation Abschnitt 5)

| Baustein | Datei | Kurzfassung |
|---|---|---|
| Schlaftag-Zuordnung (5.1) | `sleepDetection.ts` | Hauptschlaf gehört zum Datum des Aufwachens, Lücken ≤ 45 Min. werden verschmolzen, Nap < 3 h zwischen 09 und 20 Uhr, Quellen-Priorität userEdited > Wearable > Handy > manuell |
| Schlafbedarf (5.2) | `sleepNeed.ts` | Median der Erholungsnächte (sonst 80. Perzentil der letzten 30 Nächte), Grenzen 6:00–10:30 h, Glättung 0,8·alt + 0,2·neu, manuell hat Vorrang |
| Schlafschuld (5.3) | `sleepDebt.ts` | `Σ w_i · delta_i`, `w_i = 1 − i·0,85/13`, Mehrschlaf zählt halb, Naps 0,75, fehlende Nächte = Median, > 5 fehlend = „Zu wenig Daten“ + Bereich, Prognose für die nächste Nacht |
| Zwei-Prozess-Modell (5.4) | `twoProcess.ts` | S: τ_r = 18,2 h, τ_d = 4,2 h; C: Harmonische mit A = 0,12; Trägheit I0 = 0,25, τ_i = 0,6 h; Schuld-Malus D = 0,08·min(h/10, 1,5) |
| Energiekurve (5.5) | `energyCurve.ts` | 5-Min-Schritte, feste Skala 0–100, Extrema aus 30-Min-geglätteter Kurve, Fenster 45–150 Min. |
| Chronotyp (5.6) | `chronotype.ts` | MSF/MSFsc, Einstufung 03/05 Uhr, Offset ±240 Min., Lernen ab 21 Nächten mit max. 15 Min./Woche |
| Schichtmodus / Jetlag (5.7) | `twoProcess.ts` | Phase folgt dem Schlaf der letzten 1–3 Tage, max. 60 Min./Tag, Zeitzonenwechsel verschiebt um die UTC-Differenz |
| Fenster & Schlafenszeit (5.8) | `windows.ts` | Koffein-Stopp, Nap, Sport, Mahlzeit, Licht, Wind-down, Melatonin, Schlafenszeit mit/ohne Wunsch-Aufstehzeit |
| Tipps (5.9) | `recommendations.ts` | regelbasiert, 1–3 Tipps, kein Tipp länger als 2 Tage in Folge |
| Sanfter Wecker (7.8) | `alarm.ts` | Ende eines 90-Minuten-Zyklus innerhalb der Weck-Spanne |

Abweichungen von der Spezifikation (mit Begründung) stehen in [`DECISIONS.md`](DECISIONS.md). Die wichtigste: Process C nutzt die Zeitrichtung `φ − t`, und die Energie enthält einen Mittagstief-Term, sonst wären die geforderten Extremstellen mathematisch nicht erreichbar.

## Tests

`npm test` prüft Typen (`tsc --noEmit`) und führt Jest aus: Engine (Zeilenabdeckung ≈ 99 %, Mindestwert 90 % ist als Schwellwert hinterlegt), Datenschicht gegen echtes SQLite (`better-sqlite3`) und gegen den Memory-Store, Gesundheits-Konvertierung, Sync, Benachrichtigungsplan, App-Store, Komponenten (Render, Snapshot, Kontrast). Enthalten sind Tests für die Zeitumstellung in `Europe/Berlin` (März und Oktober), Nächte über Mitternacht, Zeitzonenwechsel und einen Benchmark (Tagesberechnung mit 90 Nächten deutlich unter 50 ms).

## Bekannte Einschränkungen

- **Widgets (7.7):** nicht umgesetzt, nur vorbereitet (`services/widgetSnapshot.ts` erzeugt das JSON, das ein WidgetKit-/Android-Widget lesen würde). Begründung in `DECISIONS.md`.
- **Sanfter Wecker:** iOS erlaubt Drittanbieter-Apps keinen Wecker, der den Stummschalter umgeht. Tagwerk plant eine Benachrichtigung und weist darauf hin.
- **HealthKit / Health Connect** konnten in dieser Umgebung (Linux, kein Gerät) nur kompiliert und per Prebuild geprüft, nicht mit echten Daten getestet werden. Die Konvertierung der Rohdaten ist durch Tests abgedeckt.
- **Hintergrund-Sync** (`expo-background-task`) ist „best effort“, das Betriebssystem entscheidet über die Ausführung.
- **Wissensartikel:** 13 eigene Texte mit 1,5–3 Minuten Lesezeit statt 3–5.
- Englisch ist unvollständig, fehlende Texte erscheinen auf Deutsch.
- Die Modelle sind Schätzungen. Die Konstanten sind in `src/engine/constants.ts` kalibriert und anpassbar (bei Änderungen `ENGINE_VERSION` erhöhen).
