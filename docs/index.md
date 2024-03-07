# Verfügbare Plugins / Available plugins

## Ariva.de

- Unter https://ariva.de einen neuen Benutzer-Account registrieren. Kurse sind nicht mehr ohne Registrierung abrufbar.

- [ariva.js](https://raw.githubusercontent.com/faiteanu/JavaStockQuotes/master/js/ariva.js) (zuletzt geändert 07.03.2024)
  herunterladen und unter Windows speichern unter  
  `C:\Users\{USERNAME}\.jameica\hibiscus.depotviewer\js`  
  Unter Linux das entsprechende Benutzer-Verzeichnis wählen.
  
- Die heruntergeladene Datei `ariva.js` in einem Texteditor öffnen. Die folgenden beiden Zeilen suchen und jeweils 
  `MeinUserName` und `MeinPasswort` durch die eigenen Werte ersetzen und speichern.
	```js
	form.getInputByName("username").type("MeinUserName"); // Hier Username eintragen
	form.getInputByName("password").type("MeinPasswort"); // Hier Passwort eintragen
  ```
- Jameica neu starten

Danke an [gnampf1](https://github.com/gnampf1) für den letzten Fix.
