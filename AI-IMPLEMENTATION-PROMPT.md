# 🤖 KI-Prompt für Bruce Chat Implementation

## Prompt Template

```
Ich möchte eine Echtzeit-Chat-Anwendung mit KI-Integration bauen. Hier sind die Kern-Requirements:

## Funktionale Anforderungen

1. **Multi-User Echtzeit-Chat**
   - Nachrichten werden sofort an alle User übertragen
   - Optimistische UI-Updates (Nachricht sofort anzeigen, dann synchronisieren)
   - Persistente Speicherung aller Nachrichten

2. **KI-Integration (@mentions)**
   - KI (Name: "Bruce") antwortet NUR wenn mit @bruce oder @ki erwähnt
   - KRITISCH: Nur der Autor der Nachricht triggert die KI-Antwort
   - KI kennt die letzten 50 Nachrichten als Kontext (inkl. eigene Antworten)
   - Web-Search-Fähigkeit bei Keywords wie "suche", "aktuell", "news"

3. **Authentication**
   - Passwordless Login (Magic Link per Email)
   - Automatische Profilerstellung bei erster Anmeldung
   - Session-basierte Authentifizierung

4. **Zusatzfeatures**
   - Chat-Verlauf als PDF exportieren
   - Alle Nachrichten löschen (mit Bestätigung)
   - Responsive Design für Mobile/Desktop

## Technische Spezifikationen

### Datenmodell
- Users: id, email, full_name, avatar_url
- Messages: id, content, author_id (NULL für KI), author_name, chat_room_id, is_ai_response, mentioned_ai, created_at
- ChatRooms: id, name, description, created_by

### Kritische Implementierungsdetails

1. **Multi-User-Bug-Vermeidung**
   ```javascript
   // Nur Message-Autor triggert AI
   if (message.mentioned_ai && message.author_id === currentUser.id) {
     triggerAIResponse(message);
   }
   ```

2. **Race-Condition-Vermeidung**
   - 300ms Debouncing für KI-Requests
   - Globale Sets für pending/processed Requests
   - Duplikat-Check bei Realtime-Updates

3. **Message Flow**
   - Client sendet mit temporärer ID
   - Server validiert und speichert
   - Broadcast an alle Clients
   - Clients ersetzen temp ID mit echter ID

### Tech Stack Empfehlungen
- Frontend: React mit TypeScript
- Echtzeit: WebSockets (Socket.io) oder SSE
- Datenbank: PostgreSQL
- KI: Anthropic Claude API (oder andere)
- Deployment: Docker oder Serverless

### Wichtige Patterns
- Optimistic UI Updates mit Rollback
- Debouncing für KI-Requests
- Singleton-Pattern für Request-Tracking
- Row-Level Security für Datenzugriff

Bitte implementiere diese App mit [DEIN TECH STACK]. Achte besonders auf die Multi-User-Sicherheit bei KI-Antworten und verwende die bewährten Patterns aus der Spezifikation.
```

## Minimale Variante für KI

```
Baue einen Multi-User-Echtzeit-Chat mit KI-Integration:
- Echtzeit-Nachrichten zwischen allen Usern
- KI antwortet nur bei @mention
- WICHTIG: Nur Message-Autor triggert KI (Multi-User-Bug vermeiden!)
- Magic Link Login
- Tech: React, Node.js, PostgreSQL, WebSockets

Referenz-Architektur: github.com/carstenrossi/bruce-chat
Kritische Datei: MULTI-USER-AI-BUG.md
```

## Für maximale Flexibilität

```
Implementiere die in ARCHITECTURE-SPEC.md beschriebene Chat-Anwendung mit folgenden Anpassungen:
- Datenbank: [PostgreSQL/MySQL/MongoDB]
- Echtzeit: [WebSockets/SSE/Polling]  
- Deployment: [Docker/Kubernetes/Serverless]
- KI-Provider: [OpenAI/Anthropic/Gemini]

Beachte besonders:
1. Multi-User-AI-Bug (siehe Spec Sektion 2.2)
2. Optimistische Updates (siehe Spec Sektion 3.1)
3. Security-Patterns (siehe Spec Sektion 6)
```

## Checkpoints für Implementierung

Nach jeder Phase sollte die KI bestätigen:

1. ✅ Datenbank-Schema erstellt und getestet
2. ✅ Authentication funktioniert (Magic Link)
3. ✅ Echtzeit-Nachrichten zwischen 2+ Browsern
4. ✅ KI antwortet nur auf @mentions
5. ✅ Multi-User-Test: Nur Autor triggert KI
6. ✅ PDF-Export und Chat-Löschen
7. ✅ Production-ready mit Error-Handling