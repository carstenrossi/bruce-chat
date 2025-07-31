# 📚 Bruce Chat - Dokumentationsübersicht

## Dokumentationsstruktur

### 1. **README.md**
- **Zweck:** Projekt-Übersicht und Quick Start Guide
- **Zielgruppe:** Neue Entwickler, die das Projekt kennenlernen wollen
- **Inhalt:** Features, Tech Stack, Basic Setup, Architektur-Übersicht

### 2. **SETUP.md** 
- **Zweck:** Detaillierte lokale Entwicklungsanleitung
- **Zielgruppe:** Entwickler, die lokal entwickeln wollen
- **Inhalt:** Vollständige Feature-Liste, Setup-Schritte, Multi-User Testing

### 3. **deploy-instructions.md**
- **Zweck:** Schritt-für-Schritt Deployment Guide für Vercel
- **Zielgruppe:** DevOps/Entwickler, die das Projekt live bringen wollen
- **Inhalt:** Vercel Setup, Environment Variables, Supabase Auth Config

### 4. **DEPLOYMENT-STATUS.md**
- **Zweck:** Entwicklungsfortschritt und Deployment-Tracking
- **Zielgruppe:** Projektmanager, Team-Überblick
- **Inhalt:** Erledigte Schritte, offene TODOs für Production

### 5. **MULTI-USER-AI-BUG.md**
- **Zweck:** Technische Dokumentation eines kritischen Bugs
- **Zielgruppe:** Entwickler, die ähnliche Features implementieren
- **Inhalt:** Problem-Beschreibung, Lösung, Lessons Learned

## Wichtige Dateien

### Konfigurationsdateien
- **supabase-schema.sql** - Komplettes Datenbankschema
- **migration-allow-null-author-id.sql** - Migration für AI-Messages
- **.env.local** (nicht im Repo) - Environment Variables

### Code-Struktur
```
src/
├── app/                     # Next.js App Router
│   ├── api/ai/             # Claude API Integration
│   └── auth/callback/      # Supabase Auth Callback
├── components/             # React Components
├── hooks/                  # Custom React Hooks
│   ├── useSupabaseAuth.ts  # Authentication
│   ├── useRealtimeMessages.ts # Chat + Realtime
│   ├── useAIResponse.ts    # AI Response Handling
│   └── useChatRooms.ts     # Chat Room Management
└── lib/
    └── supabase.ts         # Types & Client

## Versions-Information

- **Next.js:** 15.4.5
- **React:** 19.1.0
- **Claude Model:** claude-sonnet-4-20250514
- **Supabase:** Latest (@supabase/supabase-js@2.53.0)
- **Tailwind CSS:** v4

## Bekannte Probleme & Lösungen

1. **Multi-User AI Responses** - Gelöst durch User-Check (siehe MULTI-USER-AI-BUG.md)
2. **React 19 StrictMode** - Gelöst durch Debouncing und AbortController
3. **Realtime Duplikate** - Gelöst durch Message-ID Checks

## Re-Use Documentation (für andere Systeme)

Diese Dokumentationen befinden sich im Ordner `Re-Use Documentation/`:

### 6. **ARCHITECTURE-SPEC.md**
- **Zweck:** Technologie-unabhängige Architektur-Beschreibung
- **Zielgruppe:** Entwickler, die mit anderem Tech-Stack implementieren
- **Inhalt:** Patterns, Flows, kritische Details, Security

### 7. **AI-IMPLEMENTATION-PROMPT.md**
- **Zweck:** Prompt-Templates für KI-gestützte Implementierung
- **Zielgruppe:** Entwickler, die eine KI zur Implementierung nutzen
- **Inhalt:** Verschiedene Prompt-Varianten, Checkpoints

### 8. **TECH-STACK-MIGRATION.md**
- **Zweck:** Konkrete Migrations-Beispiele für verschiedene Stacks
- **Zielgruppe:** Teams mit bestehender Infrastruktur
- **Inhalt:** Docker, Laravel, Django, Spring Boot Beispiele

## Nächste Schritte

- [ ] Vercel Production Deployment
- [ ] Performance Monitoring Setup
- [ ] Rate Limiting für AI-Requests
- [ ] Message Threading/Replies Feature