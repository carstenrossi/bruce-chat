# 🤖 Bruce Chat - Kollaborativer KI-Chat

Ein moderner Team-Chat mit integrierter Claude KI, die nur bei @mentions antwortet.

## 📚 Dokumentation

### Setup & Deployment
- **README.md** (diese Datei) - Übersicht und Quick Start
- **SETUP.md** - Detaillierte lokale Entwicklungsanleitung
- **deploy-instructions.md** - Schritt-für-Schritt Deployment Guide
- **DEPLOYMENT-STATUS.md** - Entwicklungsstatus und Fortschritt

### Technische Dokumentation
- **MULTI-USER-AI-BUG.md** - Kritischer Multi-User Bug und Lösung
- **DOCS-OVERVIEW.md** - Übersicht aller Dokumentationen

### Re-Use Documentation (für andere Systeme)
- **Re-Use Documentation/ARCHITECTURE-SPEC.md** - Tech-Stack-agnostische Architektur
- **Re-Use Documentation/AI-IMPLEMENTATION-PROMPT.md** - Prompts für KI-gestützte Implementierung
- **Re-Use Documentation/TECH-STACK-MIGRATION.md** - Migration zu anderen Tech-Stacks

## ✨ Features

- 💬 **Realtime Chat** mit mehreren Nutzern
- 🤖 **Claude KI Integration** - erwähne @bruce oder @ki
- 🔍 **Web Search Integration** - nutze Keywords wie "suche", "aktuell", "news" für Internet-Suche
- 🔐 **Magic Link Authentication** mit Supabase
- 📱 **Responsive Design** - funktioniert überall
- ⚡ **Live Updates** - sieh Nachrichten sofort
- 🎯 **Context-Aware** - KI kennt die letzten 50 Nachrichten
- 🚫 **Anti-Loop** - KI antwortet nur auf Menschen, nicht auf sich selbst
- 📄 **PDF Export** - Chat-Verlauf als PDF exportieren
- 🗑️ **Chat löschen** - Alle Nachrichten auf einmal löschen

## 🚀 Quick Start

1. **Repo klonen und Dependencies installieren:**
```bash
git clone [dein-repo]
cd bruce-chat
npm install
```

2. **Supabase Projekt erstellen:**
   - Gehe zu [supabase.com](https://supabase.com/new)
   - Erstelle neues Projekt: "bruce-chat"
   - Führe `supabase-schema.sql` im SQL Editor aus

3. **Environment Variables:**
```bash
# Erstelle .env.local mit folgenden Variablen:
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=deine_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_supabase_anon_key
ANTHROPIC_API_KEY=dein_claude_api_key
EOF
```

4. **Development starten:**
```bash
npm run dev
```

## 🛠 Tech Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **KI:** Anthropic Claude Sonnet 4 mit Web Search
- **Deployment:** Vercel

## 📝 Verwendung

1. **Anmelden:** Klicke auf "Mit Magic Link anmelden"
2. **Chatten:** Schreibe normale Nachrichten
3. **KI erwähnen:** Verwende @bruce oder @ki für KI-Antworten
4. **Realtime:** Alle Nutzer sehen Nachrichten sofort

## 🔧 Konfiguration

### Environment Variables
```env
# Supabase (erforderlich)
NEXT_PUBLIC_SUPABASE_URL=deine_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_key

# Claude API (erforderlich)
ANTHROPIC_API_KEY=dein_claude_key

# Optional
NEXT_PUBLIC_APP_NAME="Dein Chat Name"
NEXT_PUBLIC_MAX_CONTEXT_MESSAGES=50
```

### Deployment auf Vercel

Siehe `deploy-instructions.md` für detaillierte Schritt-für-Schritt Anleitung.

## 🏗 Architektur

```
src/
├── app/                  # Next.js App Router
│   ├── api/ai/          # Claude API Endpoint
│   └── auth/callback/   # Auth Callback
├── components/          # React Components
├── hooks/              # Custom React Hooks
│   ├── useSupabaseAuth.ts
│   ├── useRealtimeMessages.ts
│   └── useAIResponse.ts
└── lib/                # Utilities
    └── supabase.ts     # DB Types & Client
```

## 🗄 Database Schema

- **profiles:** User-Daten (automatisch bei Anmeldung)
- **chat_rooms:** Chat-Räume (Standard: "Allgemeiner Chat")
- **messages:** Alle Nachrichten mit Realtime Updates

## 🤖 KI-Integration

- **Mentions:** `@bruce` oder `@ki` triggern KI-Antworten
- **Kontext:** Letzte 50 Nachrichten (inkl. eigene KI-Antworten)
- **Multi-User Safe:** Nur der Message-Autor triggert KI-Antworten
- **Debounced:** 300ms Verzögerung verhindert Race Conditions
- **Persistent:** Alle Antworten werden gespeichert

## 🎨 Customization

- **Farben:** Ändere Tailwind-Klassen in den Components
- **KI-Name:** Ändere "Bruce" in `src/app/api/ai/route.ts`
- **Prompt:** Anpasse Claude-Prompt in derselben Datei

## 🔍 Troubleshooting

**Chat lädt nicht?** → Prüfe Supabase-Verbindung und Environment Variables
**KI antwortet nicht?** → Prüfe Anthropic API Key und Konsolenlogs
**KI antwortet mehrfach?** → Siehe `MULTI-USER-AI-BUG.md` - nur bei mehreren eingeloggten Usern
**Auth funktioniert nicht?** → Prüfe Supabase Auth Settings

---

Erstellt mit ❤️ für kollaborative Teams
