# 🤖 Bruce Chat - Kollaborativer KI-Chat

Ein moderner Team-Chat mit integrierter Claude KI, die nur bei @mentions antwortet.

## ✨ Features

- 💬 **Realtime Chat** mit mehreren Nutzern
- 🤖 **Claude KI Integration** - erwähne @bruce oder @ki
- 🔍 **Web Search Integration** - nutze Keywords wie "suche", "aktuell", "news" für Internet-Suche
- 🔐 **Magic Link Authentication** mit Supabase
- 📱 **Responsive Design** - funktioniert überall
- ⚡ **Live Updates** - sieh Nachrichten sofort
- 🎯 **Context-Aware** - KI kennt die letzten 50 Nachrichten
- 🚫 **Anti-Loop** - KI antwortet nur auf Menschen, nicht auf sich selbst

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
cp .env.local.example .env.local
# Fülle deine Supabase und Anthropic API Keys ein
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

1. **Repository zu Vercel connecten**
2. **Environment Variables setzen** (siehe oben)
3. **Deploy!** - Vercel erkennt Next.js automatisch

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
- **Kontext:** Letzte 50 menschliche Nachrichten (keine KI-Loops)
- **Async:** KI-Antworten kommen nach 1.5s Delay
- **Persistent:** Alle Antworten werden gespeichert

## 🎨 Customization

- **Farben:** Ändere Tailwind-Klassen in den Components
- **KI-Name:** Ändere "Bruce" in `src/app/api/ai/route.ts`
- **Prompt:** Anpasse Claude-Prompt in derselben Datei

## 🔍 Troubleshooting

**Chat lädt nicht?** → Prüfe Supabase-Verbindung und Environment Variables
**KI antwortet nicht?** → Prüfe Anthropic API Key und Konsolenlogs
**Auth funktioniert nicht?** → Prüfe Supabase Auth Settings

---

Erstellt mit ❤️ für kollaborative Teams
