# Nelsons Tools

Eine Sammlung kleiner Webtools für den täglichen Gebrauch. Ziel ist es, wiederkehrende Aufgaben schnell und einfach im Browser erledigen zu können.

## Hauptfunktionen
- **Bestandsrechner** für die Verwaltung von Lagerbeständen (`stockmgnt`)
- **Schichtkalender** zur Planung von Dienstschichten (`shifts`)

## Lokale Nutzung
### HTML-Dateien direkt öffnen
Die Inhalte im Ordner `nginx/html` können direkt im Browser geöffnet werden, z.B. `index.html`.

### Nginx verwenden
1. Nginx installieren.
2. Den Ordner `nginx/html` als Webroot konfigurieren oder nach `/var/www/html` kopieren.
3. Nginx starten und im Browser `http://localhost` aufrufen.

## Stock-Historie in der Datenbank speichern
Für die Persistierung der Lagerstände steht ein kleines Node.js-Backend im Ordner `server` bereit. Es stellt eine REST-API
unter `/api/stock-history` bereit und speichert die Daten in der PostgreSQL-Datenbank `nelsons-tools` (Host:
`nelsons-tools-db-1`). Die Einträge werden in der Tabelle `lagerstand` abgelegt, die pro Getränk eine eigene Spalte besitzt.

### Voraussetzungen
- Node.js 18 oder höher
- Eine erreichbare PostgreSQL-Instanz mit der Datenbank `nelsons-tools`

Die Zugangsdaten können über Umgebungsvariablen überschrieben werden:

| Variable        | Standardwert              |
|-----------------|---------------------------|
| `DB_HOST`       | `nelsons-tools-db-1`      |
| `DB_PORT`       | `5432`                    |
| `DB_NAME`       | `nelsons-tools`           |
| `DB_USER`       | `postgres`                |
| `DB_PASSWORD`   | `postgres`                |
| `PORT`          | `3000`                    |

### Starten des Backends

```bash
npm install
npm start
```

 Das Backend legt beim Start automatisch die Tabelle `lagerstand` mit den Spalten `wine`, `gosser`, `cider`, `stiegl`,
 `thalheim`, `staro`, `kilkenny`, `hophouse` und `guinness` an. Für den produktiven Einsatz kann ein Reverse Proxy (z. B.
 Nginx) genutzt werden, um die API unter dem gleichen Host wie die statischen Dateien erreichbar zu machen.

