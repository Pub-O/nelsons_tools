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

### Schritt-für-Schritt-Anleitung: Betrieb mit Nginx und Docker

Die folgenden Schritte führen von einer leeren Umgebung zur lauffähigen Anwendung. Sie können vollständig mit Docker
und Docker Compose umgesetzt werden.

1. **Repository auschecken**
   ```bash
   git clone <repo-url>
   cd nelsons_tools
   ```
2. **Umgebungsvariablen festlegen** (optional): Legen Sie falls nötig eine Datei `.env` neben der `docker-compose.yml`
   an, um Datenbankzugang oder Ports zu überschreiben (siehe Tabelle oben).
3. **PostgreSQL-Instanz bereitstellen**: Standardmäßig erwartet das Backend eine Datenbank im Container
   `nelsons-tools-db-1`. Wenn Sie bereits eine Instanz haben, passen Sie entweder den Hostnamen in der Datenbank an
   oder überschreiben `DB_HOST` in Schritt 2.
4. **Container starten**
   ```bash
   docker compose up -d
   ```
   Docker Compose baut das Backend-Image aus `server/Dockerfile`, startet den Backend-Container, Nginx und – falls
   benötigt – die optionale PostgreSQL-Datenbank.
5. **Datenbank prüfen**: Sobald der Backend-Container läuft, legt er automatisch die Tabelle `lagerstand` an. Sie
   können die Struktur beispielsweise mit `docker exec -it nelsons-tools-db-1 psql -U postgres -d nelsons-tools -c
   "\d lagerstand"` kontrollieren.
6. **Anwendung aufrufen**: Öffnen Sie `http://localhost:8080`. Nginx liefert die statischen Dateien aus `nginx/html`
   und leitet API-Requests nach `/api/` an das Backend unter `http://backend:3000` weiter.
7. **Logs kontrollieren** (optional): Nutzen Sie `docker compose logs -f backend` bzw. `docker compose logs -f nginx`,
   um sicherzustellen, dass die Services fehlerfrei arbeiten.

### Details zur Container-Konfiguration

Für den Betrieb in einer Container-Umgebung stellt dieses Repository vorbereitete Konfigurationsdateien bereit:

- `server/Dockerfile` baut das Node.js-Backend als schlankes Container-Image.
- `nginx/default.conf` konfiguriert Nginx so, dass statische Dateien ausgeliefert und API-Aufrufe an das Backend
  weitergeleitet werden.
- `docker-compose.yml` startet Nginx, das Backend sowie (optional) eine PostgreSQL-Instanz im selben Docker-Netzwerk.

Wenn Sie bereits einen eigenen Nginx-Container einsetzen, können Sie die obige Schritt-für-Schritt-Anleitung ab Schritt
3 verwenden und lediglich Schritt 4 anpassen: Starten Sie den Backend-Container mit `docker build`/`docker run` wie
gezeigt und binden Sie Ihren bestehenden Nginx in dasselbe Docker-Netzwerk ein. Wichtig ist, dass Anfragen an `/api/`
an `http://nelsons-tools-backend:3000` weitergeleitet werden und das Backend Zugriff auf die PostgreSQL-Datenbank hat.

