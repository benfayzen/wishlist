# M3-Expressive-Komponentencheck

Stand: 22. Oktober 2026. Ergebnis: Die Basis passt bereits weitgehend zu M3E.
Die größten Verbesserungen liegen in Auswahlzuständen, Aktionshierarchie und
einigen noch aus Skeleton übernommenen Komponenten.

Umsetzungsstand: Die priorisierten Komponentenänderungen wurden anschließend
implementiert. Details und Prüfergebnisse stehen in
[Material-3-Expressive-Umsetzung](material-3-expressive.md#component-audit-implementation--2026-10-22).
Die folgenden Abschnitte dokumentieren den ursprünglichen Auditbefund.

## Umfang und Aussagekraft

- Inventar: 126 Svelte-Dateien in `src`, einschließlich Seiten und Layouts.
- Vertiefter Quellcodecheck der gemeinsamen Komponenten, ihrer Styles und ihrer
  Verwendung in Listen, Reservierungen, Formularen, Account und Administration.
- Ergänzende Sichtprüfung vorhandener Aufnahmen: Reservierungen am Desktop,
  aktuelle mobile Listenansicht, Wunschformular und Administration. Die beiden
  letzteren Aufnahmen zeigen noch einen älteren Navigationsstand; für die
  aktuelle Navigation ist deshalb der Quellcode maßgeblich.
- Kein neuer Live-Browserdurchlauf, keine Laufzeittests und keine Änderungen am
  Anwendungscode. Empfehlungen sind noch nicht umgesetzt. Visuelle und
  semantische Quellcodebefunde sind keine vollständige Barrierefreiheitsprüfung.

## Priorisierte Empfehlungen

### Hoch: Gruppierung der Reservierungen vereinheitlichen

Fundstelle: `src/lib/components/wishlists/chips/ClaimsGroupBy.svelte`.

Noch ein Skeleton `SegmentedControl`, dessen sichtbare Kontrollfläche mit
`h-6.5` deutlich kleiner als die benachbarte Ansichtsauswahl gestaltet ist.
Die tatsächliche Trefferfläche wurde hier nicht im Browser gemessen.

**Aus M3:** Connected Button Groups ersetzen Segmented Buttons und eignen sich
für verwandte, auswählbare Optionen wie Gruppierung und Ansichtswechsel.

**Empfehlung für Wishlist:** Das vorhandene `ConnectedButtonGroup` mit sichtbaren
Labels für „Gekauft“ und „Benutzer“ wiederverwenden. Exklusive Auswahl und
Gruppierungslogik erhalten. Die beschriftete Variante auf schmalen Bildschirmen
zusammen mit dem Filter auf Umbruch prüfen; der äußere Container in
`src/routes/claims/+page.svelte` ist derzeit nicht selbst umbrechend.

### Hoch: Filter, Auswahl und Verwaltungsaktionen unterscheiden

Fundstellen: `wishlists/chips/BaseChip.svelte`, `ClaimFilter.svelte`,
`SortBy.svelte`, `ManageListChip.svelte`, `ReorderChip.svelte`,
`src/styles/material.css`.

Die als Chips benannten Filter rendern aktuell normale pillenförmige Buttons.
Die Regel `.m3-filter button.chip` greift für deren aktuellen Klassen nicht.
„Verwalten“ und „Anordnung bearbeiten“ sind beide stark gefüllt; auf der
mobilen Aufnahme beanspruchen sie viel Aufmerksamkeit und mehrere Zeilen.

**Aus M3:** Filter Chips verändern die angezeigten Inhalte. Menüs sind für
temporäre Auswahl/Aktionen geeignet. Connected Groups sind auswählbaren
Optionen vorbehalten. Toolbars bündeln Seitenaktionen.

**Empfehlung für Wishlist:**

- Filter als konsistente Filter-Chip-Komponente mit erkennbarem Aktivzustand;
  Sortierung als klar beschrifteter Auswahltrigger mit aktuellem Wert.
- Im Einfachauswahlmenü die aktive Option sichtbar und programmatisch markieren.
- Mehrfachfilter mit Checkboxen und „Anwenden“ als Auswahl-Popover beibehalten.
  Das ist ein kleines Formular; es sollte nicht einfach `role="menu"` erhalten.
- Verwalten als zurückhaltende Aktion, Anordnung als Einstieg in einen Modus.
  Während dieses Modus darf „Fertig“ deutlich hervortreten.
- Verwandte Aktionen in einer gemeinsamen Aktionsleiste bündeln;
  eine unten angedockte Toolbar wäre bei vorhandener Bottom Navigation unpassend.

**Zusätzlicher Funktionsbefund:** In `BaseChip.svelte:35` liest `direction`
`searchParam` statt `directionParam`. Außerdem wählt die Schleife bei einem
passenden Sortierwert in beiden Zweigen die erste Option, unabhängig von der
Richtung. Damit kann `?sort=price&dir=desc` als aufsteigend angezeigt werden.
Beim Umbau zuerst die Kombination aus Wert und Richtung korrekt wiederherstellen.

### Hoch: Einen echten FAB für „Wunsch hinzufügen“ verwenden

Fundstellen: `src/routes/lists/[id]/+page.svelte`, `.m3-page-fab` in
`src/styles/material.css`.

Die Aktion ist bereits richtig als persistente Hauptaktion positioniert, erbt
aber Form und Verhalten eines gewöhnlichen runden Icon Buttons. Ihre aktuelle
Breite beträgt mobil 64 CSS-Pixel und ab dem vorhandenen Media Query 80.

**Aus M3:** FABs sind eigenständige Komponenten mit einer eher quadratischen,
abgerundeten Form. Ein Extended FAB eignet sich, wenn ein Label nötig ist.

**Empfehlung für Wishlist:** Eigene FAB-Styles statt vollständiger Vererbung vom
Icon Button; Form, Icon und Zustände am passenden FAB-Tokensatz ausrichten.
Den bestehenden Abstand zur Bottom Navigation erhalten. Auf größeren Screens
ist „Wunsch hinzufügen“ als Extended FAB verständlicher. Das ist eine
Produktentscheidung, kein vorgeschriebener Breakpoint. Den englischen
zugänglichen Namen `add item` lokalisieren und einen Desktop-Tooltip vorsehen.
Ein FAB-Menü bietet für die derzeit einzige Hauptaktion keinen Vorteil.

### Mittel: Speicheraktionen als Split Button prüfen

Fundstelle: `src/lib/components/wishlists/ItemForm.svelte:425`.

**Aus M3:** Ein Split Button kombiniert eine Hauptaktion mit einem Menü
verwandter Aktionen.

**Empfehlung für Wishlist:** Hauptaktion „Erstellen“, zusätzliche Aktion
„Erstellen und weiteres hinzufügen“ im zugehörigen Menü. Das verkürzt die
Aktionszeile, besonders auf kleinen Screens. Abbrechen bleibt separat und
kann als Text Button zurücktreten. Für das Bearbeiten eines bestehenden
Wunschs bleibt ein normaler Speicherbutton passend. Falls „weiteres hinzufügen“
sehr häufig verwendet wird, sind zwei direkt sichtbare Buttons weiterhin eine
vertretbare Produktentscheidung.

### Mittel: Kurze Wartezeiten, lange Vorgänge und echte Werte trennen

Fundstellen: `src/styles/loading.css`, `Backdrop.svelte`,
`navigation/NavigationLoadingBar.svelte`, Formulare mit `.loading`.

**Aus M3:** Loading Indicators eignen sich für kurze unbestimmte Wartezeiten;
Progress Indicators für längere Vorgänge oder messbaren Fortschritt.

**Empfehlung für Wishlist:** Kurze Speichervorgänge mit einem gemeinsamen
M3E Loading Indicator darstellen. Produktimport kann länger dauern und sollte
seinen Status lokal im Importbereich zeigen; einen längeren Import nicht allein
wegen des Expressive-Looks mit einem kurzen Ladeindikator darstellen.
Der globale graue `Backdrop` mit Gesamt-Opacity ist dafür keine gute gemeinsame
Standardlösung. Er bildet außerdem weder eine Dialog-Fokusführung noch einen
explizit inerten Hintergrund ab.

Die Navigationsleiste interpoliert zeitbasiert bis 90 Prozent, ohne gemessenen
Fortschritt. Dafür ist ein unbestimmter linearer Indikator ehrlicher.
Die bestehende SVG-Maskenanimation nutzt SMIL; CSS-Regeln gegen Animationen
beweisen dafür allein keine wirksame Reduced-Motion-Unterstützung. Bei einem
Umbau die Animation explizit an die Systemeinstellung koppeln.

Die Reservierungsquote auf Listenkarten bleibt eine statische Verhältnis-/
Statusanzeige, die Passwortstärke eine Bewertungsanzeige. Beide dürfen nicht
durch einen animierten Loading Indicator ersetzt werden.

### Mittel: Lange mobile Auswahllisten adaptieren

Fundstellen: `BaseChip.svelte`, `GroupSelectChip.svelte`, `GroupSelectModal.svelte`,
`AddUserModal.svelte`, `SelectListManagerModal.svelte`, `ItemDrawer.svelte`.

**Aus M3:** Auf kompakten Screens können Bottom Sheets mehr Platz für längere
Menüoptionen bieten; auf großen Screens bleiben verankerte Menüs passend.
Side Sheets ergänzen den Hauptinhalt. Dialoge verlangen eine Unterbrechung.

**Empfehlung für Wishlist:** Umfangreiche Filter-/Personenauswahl mobil als
Modal Bottom Sheet prüfen, am Desktop als verankerte Auswahl bzw. vorhandenen
Dialog. Kurze Bestätigungen und Löschabfragen bleiben Dialoge. Die Komponente
`ItemDrawer` ist tatsächlich ein zentrierter Dialog; eine ergänzende Side Sheet
am Desktop und eine mobile Detailansicht könnten den Listenkontext besser
erhalten. Das ist ein größerer Ablaufumbau, keine notwendige Sofortkorrektur.

### Mittel: Icon-Toggles und kleine Hilfsaktionen vervollständigen

Fundstellen: `ItemCard/ClaimButtons.svelte`, `Tooltip.svelte`,
`PasswordInput.svelte`, `ListStatistics.svelte`, `TokenCopy.svelte`.

Der „Gekauft“-Button ist bereits ein sofort wirkender Toggle, hat aber keinen
`aria-pressed`-Zustand. Ein M3 Toggle Icon Button mit unterscheidbaren aktiven
und inaktiven Zuständen passt hier. Die Passwortsichtbarkeit setzt
`aria-pressed` bereits und ist das passende Muster.

Hilfetrigger und „alle Währungen anzeigen“ haben nicht überall eine explizit
große Trefferfläche. Gemeinsame Icon-/Text-Button-Primitives verwenden, ohne
alle Nebenaktionen tonal zu füllen. `Tooltip.svelte` ist ein klickbares
Erklär-Popover, kein einfacher Hover-Tooltip; dafür einen beschreibenden,
lokalisierten Namen statt `aria-label="tooltip"` und eine passende Rich-Tooltip-
bzw. Popover-Gestaltung verwenden. Wesentliche Formhinweise sichtbar lassen.
Kopierbestätigung als zugängliche Statusmeldung ergänzen.

### Mittel: Toast-Rückmeldungen an Snackbar-Verhalten annähern

Fundstellen: `toaster/index.ts`, `toaster/Toaster.svelte`, `src/styles/toast.css`.

Aktuell ein farbcodierter Toaster mit `overlap: true`; eine Begrenzung auf eine
sichtbare Meldung ist im Wrapper nicht festgelegt. Die konkrete Anzahl gleichzeitig
sichtbarer Meldungen hängt auch vom Bibliotheksstandard ab und wurde nicht neu
im Browser gemessen.

**Aus M3:** Snackbars zeigen unaufdringliche Rückmeldungen einzeln und verwenden
Inverse-Surface-Rollen. Wichtige Fehler bleiben am betroffenen Feld bzw. Vorgang.

**Empfehlung für Wishlist:** Einen gemeinsamen Snackbar-Vertrag mit einer
sichtbaren Rückmeldung, passenden semantischen Rollen und Inline-Erfolgsmeldung
für Speichern/Kopieren vorsehen. `theme.ts` erzeugt die benötigten inversen
Farbrollen bereits. „Rückgängig“ nur ergänzen, wenn die jeweilige Aktion wirklich
rückgängig gemacht werden kann.

## Gesamtes Komponenteninventar nach Einsatzbereich

Die Entscheidungen beziehen sich auf Bausteine einschließlich ihrer Varianten;
mehrere Svelte-Dateien teilen sich deshalb eine Tabellenzeile.

| Element / Einsatz                                  | Bewertung                      | Passende Alternative oder nächste Verbesserung                                                                                                  |
| -------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Kleine App Bar, Logo, Account-Avatar               | Beibehalten                    | Für diese App passt die kompakte Variante; größere flexible App Bars sind kein pauschaler Gewinn.                                               |
| Bottom Navigation, ein-/ausgeklappte Rail          | Beibehalten                    | Bereits adaptive M3E-Navigation mit erkennbaren aktiven Zielen.                                                                                 |
| Gerundeter Content-Bereich und eigenes Scrollen    | Beibehalten                    | Produktlayout; keine zusätzliche Expressive-Komponente nötig.                                                                                   |
| Konto- und Admin-Tabs                              | Beibehalten                    | Wechseln Inhaltsbereiche; Connected Groups wären hier kein automatischer Ersatz.                                                                |
| Markdown Schreiben/Vorschau                        | Beibehalten                    | Tabs sind für Inhaltsansichten vertretbar; Panel-Zuordnung bei künftigen Arbeiten mitprüfen.                                                    |
| Hell/Dunkel/System und Liste/Kacheln               | Beibehalten                    | Connected Groups passen. Beschriftete Gruppen nicht ungeprüft über die gesamte Fensterbreite dehnen.                                            |
| Gruppierung von Reservierungen                     | Ersetzen                       | Connected Button Group statt verbliebenem SegmentedControl.                                                                                     |
| Inhaltsfilter und Sortierung                       | Überarbeiten                   | Echte Filter-Chip-Zustände, eindeutige Einfach-/Mehrfachauswahl, Richtung korrigieren.                                                          |
| Verwalten und Anordnung bearbeiten                 | Überarbeiten                   | Zurückhaltende Seitenaktionen; klare Modusrückmeldung und hervorgehobenes Fertig.                                                               |
| Hinzufügen-Hauptaktion                             | Überarbeiten                   | Eigenständiger FAB, optional Extended FAB mit Label.                                                                                            |
| Speichern, Anmelden, Registrieren, Zurücksetzen    | Beibehalten                    | Filled Primary für die Hauptaktion, konsistenter Lade- und Fehlerzustand.                                                                       |
| Erstellen plus weiteres hinzufügen                 | Alternative sinnvoll           | Split Button reduziert die Länge der Aktionszeile.                                                                                              |
| Abbrechen, Zurück, Markdown-Hilfe, Alles auswählen | Feinschliff                    | Text-/Standard-Buttons nach Priorität; weniger tonale Konkurrenz zur Hauptaktion.                                                               |
| Bearbeiten, Löschen, Vorschläge annehmen/ablehnen  | Beibehalten                    | Icon Buttons passen; bei unklaren Symbolen Labels/Tooltips. Destruktive Aktion getrennt von Speichern halten.                                   |
| Gekauft-Markierung                                 | Überarbeiten                   | Toggle Icon Button mit programmatischem Auswahlzustand.                                                                                         |
| Drag Handle, Positionsfeld, Auf-/Ab-Aktionen       | Beibehalten                    | Bieten direkte und tastaturbedienbare Alternativen; kein Slider für exakte Positionen.                                                          |
| Text-, E-Mail-, URL- und Passwortfelder            | Beibehalten                    | Gemeinsame Feldhülle und Fehlerzustände passen. Statische Labels und abweichende Rundung bleiben dokumentierte Produktentscheidungen.           |
| Preis plus Währung                                 | Beibehalten                    | Zusammengesetztes Feld und durchsuchbare Währungsauswahl passen.                                                                                |
| Exakte Anzahl / unbegrenzt                         | Beibehalten                    | Number Field plus Checkbox; Slider wäre für genaue Mengen unpassend.                                                                            |
| Native Selects, Sprache, Gruppen-/Listenmodus      | Beibehalten                    | Für lange oder platzsparende Auswahl sinnvoll. Für wenige erklärungsbedürftige Optionen kann eine Radio-Liste verständlicher sein.              |
| Admin-Suche                                        | Beibehalten                    | Lokales Suchfeld reicht; eine Search App Bar wäre für eine Nebenseite überdimensioniert.                                                        |
| Icon- und Währungs-Combobox                        | Beibehalten                    | Durchsuchbare Auswahl hat echten Nutzen. Vorhandene Tastaturlogik erhalten.                                                                     |
| Checkboxen für Listen, Teilen und Einstellungen    | Beibehalten                    | Mehrfachauswahl bzw. gemeinsame Übernahme mit Speichern. Switches erst bei tatsächlich sofortiger Persistierung erwägen.                        |
| Großer Wunsch / Most Wanted                        | Optionaler Feinschliff         | Ein beschrifteter Toggle Button könnte die besondere Markierung stärker zeigen; Checkbox ist funktional passend.                                |
| Farbe der Liste                                    | Feinschliff                    | Native Farbauswahl behalten; optionale kuratierte Farbauswahl wäre eine eigene Produktentscheidung, kein vorgeschriebener M3E Color Picker.     |
| Bild-/Profilupload                                 | Beibehalten                    | Upload-Ablauf mit Button passt; Dateiauswahl ist nicht durch eine eigene neue M3E-Komponente zu ersetzen.                                       |
| Formularabschnitte und Einstellungsgruppen         | Beibehalten                    | Inhaltliche Gruppierung passt. Nicht jeden Abschnitt zusätzlich zur Karte machen.                                                               |
| Listenübersicht als Karten                         | Beibehalten                    | Karten tragen Name, Besitzer und Status sinnvoll. Kein Carousel für durchsuchbare Übersichten.                                                  |
| Wünsche als Kacheln                                | Beibehalten                    | Bildreiche Karten passen. Bild und zugehörige Aktionen zusammenhalten.                                                                          |
| Wünsche als Zeilen                                 | Optionaler Umbau               | Expressive Lists mit führendem Bild, Hauptinhalt und nachgestellten Aktionen können kompakter sein; keine reine CSS-Umbenennung.                |
| Nutzer-/Manager-Auswahl in Dialogen                | Feinschliff                    | Selectable Expressive List mit erkennbarem Auswahlzustand; mobile Anpassung bei langen Listen.                                                  |
| Admin-Nutzer-/Gruppentabellen                      | Adaptieren                     | Tabellen am Desktop erhalten; auf schmalen Screens Expressive List mit sekundären Angaben prüfen.                                               |
| Gruppenlabels in Tabellen                          | Feinschliff                    | Ruhige Metadaten-/Tag-Darstellung; nicht mit auswählbaren Filter Chips oder Benachrichtigungs-Badges verwechseln.                               |
| Reservierungsquote und Passwortstärke              | Beibehalten                    | Statische Werte/Bewertung; keine Ladeanimation. Zugänglichen Namen und Wert prüfen.                                                             |
| Neue Wünsche und ausstehende Freigaben             | Feinschliff                    | Kleine Badge-/Statusanzeige mit zugänglicher Bedeutung; keine notwendige Umgestaltung der gesamten Karte.                                       |
| Kurze Bestätigung, Warnung, Löschdialog            | Beibehalten                    | Dialog für notwendige Entscheidungen; keine pauschale Umstellung auf Sheets.                                                                    |
| Wunschdetails                                      | Optionaler Umbau               | Ergänzende Side Sheet am Desktop, geeignete mobile Detailansicht.                                                                               |
| Konto-Popover mit Theme-Auswahl                    | Beibehalten / gestalten        | Gemischtes Popover statt blindem Menu-Role-Umbau; enthaltene Auswahl bleibt separat bedienbar.                                                  |
| Einfache temporäre Aktionsmenüs                    | Überarbeiten                   | Vertical-Menu-Gestaltung und vollständiges Menü-Tastaturverhalten zusammen umsetzen.                                                            |
| Hilfe, Kopieren und Statistikausklappen            | Feinschliff                    | Plain/Rich Tooltip nach Inhalt, deutliche Trefferflächen und Statusmeldungen.                                                                   |
| Kurze Ladezustände, Import, Navigation             | Überarbeiten                   | Loading Indicator vs. unbestimmter Progress nach Dauer und tatsächlichem Prozess.                                                               |
| Erfolg-/Fehlerrückmeldungen                        | Überarbeiten                   | Snackbar-Vertrag für flüchtige Meldungen, Inline-Meldungen für lokale Fehler.                                                                   |
| Dauerhafte Hinweise / SMTPAlert                    | Beibehalten                    | Sichtbare Inline-Hinweise; nicht in kurzlebige Snackbars verschieben.                                                                           |
| Leerzustände, Fehlerseiten und Illustrationen      | Beibehalten / feinschleifen    | Bestehende klare Meldung; bei leeren eigenen Listen eine direkte Erstellen-Aktion erwägen.                                                      |
| Setup-Begrüßung                                    | Feinschliff                    | Start-Aktion direkt erreichbar machen; erzwungenes Warten ist durch Expressive Motion nicht begründet.                                          |
| Avatare, Bild-Fallbacks, Markdown-Ausgabe          | Beibehalten                    | Keine alternative Komponente nötig; dekorative Expressive Shapes sind optional und sparsam einzusetzen.                                         |
| Typografie, Farbe, Form und Bewegung               | Beibehalten / vereinheitlichen | Semantische Rollen und selektive Betonung passen. Restliche Skeleton-/Preset-Stile gezielt angleichen statt jeden Screen stärker zu dekorieren. |

## Umsetzung und Quellen

Reihenfolge für eine nächste Umsetzung: Auswahl-/Sortierzustände und
Gruppierung zuerst; danach FAB und Aktionshierarchie; anschließend Split Button,
Laderückmeldung und Snackbar; größere adaptive Sheets/Listen zuletzt.

Das Projekt verwendet Svelte und Skeleton. Die empfohlenen M3E-Bausteine sind
Designmuster, keine Zusage, dass alle als fertige offizielle Svelte-Komponenten
verfügbar sind. Bestehende Fokus-/Tastaturlogik geeigneter Primitives erhalten.
Für Aktionsmenüs reicht ein Popover mit anders gerundeten Ecken allein nicht aus.

M3-Aussagen wurden mit dem lokalen `m3-expressive`-Skill abgeglichen, insbesondere
`references/components/buttons.md`, `input.md`, `feedback.md`, `containment.md`,
`bars.md`, `fabs.md` sowie `component-tokens.md` und `platforms.md`.
Die dort extrahierten Richtlinien sind die Grundlage; die M3-Webseiten liefern
beim direkten Webabruf nur eine JavaScript-Hülle.

Offizielle Referenzen zum Nachschlagen:

- [Button Groups](https://m3.material.io/components/button-groups/overview)
- [Split Button: offizielle Material-Dokumentation](https://github.com/material-components/material-components-android/blob/master/docs/components/SplitButton.md)
- [Chips](https://m3.material.io/components/chips/overview)
- [Menus](https://m3.material.io/components/menus/overview)
- [FAB](https://m3.material.io/components/floating-action-button/overview)
- [Lists](https://m3.material.io/components/lists/overview)
- [Loading Indicator](https://m3.material.io/components/loading-indicator/overview)
- [Progress Indicators](https://m3.material.io/components/progress-indicators/overview)
- [Snackbar](https://m3.material.io/components/snackbar/overview)
