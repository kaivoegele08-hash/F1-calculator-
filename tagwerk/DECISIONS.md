# Entscheidungen

- App liegt im Unterordner `tagwerk/` des bestehenden Repos, damit der vorhandene F1-Rechner unberührt bleibt.
- Expo SDK 58 (aktuell installiert), expo-router mit Root-Ordner `app/` wie in der Spezifikation.
- Process C: Die Formel nutzt `x = φ − t` (Zeitrichtung umgekehrt gegenüber `t − φ`). Nur so steigt die Kurve ~16 h langsam und fällt ~8 h schnell, mit Minimum ≈ 04:00 und Maximum ≈ 20:00. Mit `t − φ` wäre der Abstand Minimum→Maximum nur 8 h und die Vorgabe (04–05 Uhr / 18–20 Uhr) unerreichbar.
- Energie: `E = 2.5·C + Semidian − S − I − D`. Der Gewichtungsfaktor und eine zirkasemidiane Komponente (Mittagstief) kommen zur Spezifikation dazu, sonst hat die Kurve nur einen monotonen Abfall und kein Morgenhoch / Nachmittagstief / Abendhoch. Beide Werte stehen in `constants.ts`.
- Schlafträgheit ist zusätzlich nahe am C-Minimum stärker (Faktor 1 + 0.5·Nähe), wie im Text der Spezifikation beschrieben.
- Prozess S wird pro Segment exakt (geschlossene Form) statt in 5-Minuten-Schritten simuliert. Gleiches Ergebnis, schneller.
- Normierung der Energie: feste Skala aus einem ausgeschlafenen Referenztag (`E_MIN_REF`, `E_MAX_REF`).
- Habituelle Einschlafzeit des Referentyps = 22:30; Melatonin-Fenster startet dort (DLMO ≈ 20:30).
- Erster Schlafbedarf-Schätzwert wird nicht geglättet (nichts zum Glätten); danach 0.8·alt + 0.2·neu.
- Zeitzonen-/Jetlag-Logik: Beim Wechsel der Session-Zeitzone verschiebt sich die Phase um die UTC-Differenz und holt dann max. 60 Min./Tag auf.
- Eigene Zeitzonen-Offset-Berechnung via `Intl` statt `date-fns-tz.getTimezoneOffset`, weil Letzteres rund um Zeitumstellungen um eine Stunde abwich.
- Engine bekommt `needMinutes` von außen (gecachter Schätzwert), die teure 90-Tage-Schätzung läuft nur nachts bzw. nach Datenänderungen.
