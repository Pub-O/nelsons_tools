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

### Betrieb im Docker-Setup mit Nginx

Für den Einsatz in einer Container-Umgebung stellt dieses Repository vorbereitete Konfigurationsdateien bereit:

- `server/Dockerfile` baut das Node.js-Backend als schlankes Container-Image.
- `nginx/default.conf` konfiguriert Nginx so, dass statische Dateien ausgeliefert und API-Aufrufe an das Backend
  weitergeleitet werden.
- `docker-compose.yml` startet Nginx, das Backend sowie (optional) eine PostgreSQL-Instanz im selben Docker-Netzwerk.

#### Schnellstart mit Docker Compose

```bash
docker compose up -d
```

Der Befehl baut das Backend-Image, startet alle Services und macht die Anwendung unter `http://localhost:8080`
erreichbar. Die API wird vom Nginx-Container automatisch an den Backend-Container (`http://backend:3000`) weitergeleitet.

#### Einbindung in bestehende Umgebungen

Wenn bereits ein Nginx-Container im Einsatz ist, können folgende Schritte übernommen werden:

1. Backend-Image bauen und starten:
   ```bash
   docker build -t nelsons-tools-backend -f server/Dockerfile .
   docker run -d --name nelsons-tools-backend --network <gemeinsames-netzwerk> \
     -e DB_HOST=nelsons-tools-db-1 -e DB_NAME=nelsons-tools -e DB_USER=postgres -e DB_PASSWORD=postgres \
     nelsons-tools-backend
   ```
2. Den Nginx-Container in dasselbe Docker-Netzwerk hängen (oder Nginx neu starten und das `nginx/default.conf`
   verwenden). Wichtig ist die Proxy-Weiterleitung der Route `/api/` an `http://nelsons-tools-backend:3000`.
3. Sicherstellen, dass der Datenbank-Container den Hostnamen `nelsons-tools-db-1` trägt oder die Umgebungsvariable
   `DB_HOST` im Backend entsprechend angepasst wird.

Damit stehen die statischen Inhalte weiterhin über Nginx zur Verfügung und alle API-Anfragen der Webseite werden
transparent an das Backend übergeben, welches die Einträge in der Tabelle `lagerstand` ablegt.

