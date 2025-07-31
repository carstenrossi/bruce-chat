# Bruce Chat Setup Guide

## 🎯 **Was bereits funktioniert:**
✅ Chat UI mit responsivem Design  
✅ @bruce/@ki Mention Detection  
✅ Simulierte KI-Antworten  
✅ TypeScript & Tailwind Setup  
✅ Supabase Type Definitionen  

## 🚧 **Nächste Schritte:**

### 1. Supabase Projekt einrichten
```bash
# Gehe zu https://supabase.com/new
# Erstelle neues Projekt: "bruce-chat"
# Kopiere URL und anon key in .env.local
```

### 2. Database Schema erstellen
Führe diese SQL-Befehle in Supabase SQL Editor aus:

```sql
-- Users/Profiles Tabelle
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Rooms Tabelle
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Tabelle
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  author_name TEXT NOT NULL,
  chat_room_id UUID REFERENCES chat_rooms(id) NOT NULL,
  is_ai_response BOOLEAN DEFAULT FALSE,
  mentioned_ai BOOLEAN DEFAULT FALSE,
  parent_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies für angemeldete User
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view all chat rooms" ON chat_rooms FOR SELECT USING (true);
CREATE POLICY "Users can create chat rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view all messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Realtime für Messages aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 3. Environment Variables
Erstelle `.env.local` mit:
```env
NEXT_PUBLIC_SUPABASE_URL=dein_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_supabase_anon_key
ANTHROPIC_API_KEY=dein_claude_api_key
```

### 4. Development Server
```bash
npm run dev
# Öffne http://localhost:3000
```

### 5. Multi-User Testing (WICHTIG!)
```bash
# Teste IMMER mit mehreren Browser-Sessions:
# 1. Öffne http://localhost:3000 in Browser 1
# 2. Öffne http://localhost:3000 in Inkognito/Browser 2
# 3. Logge dich mit verschiedenen Accounts ein
# 4. Teste @bruce mentions - nur 1 Antwort sollte erscheinen!
```

## 🔧 **Features im Detail:**

### Chat Interface
- ✅ Vollständiges responsive Layout
- ✅ Message Bubbles mit Zeitstempel
- ✅ User-spezifische Farbcodierung
- ✅ KI-Messages mit besonderem Styling

### @Mentions
- ✅ Detection von @bruce und @ki
- ✅ Echte Claude API Integration mit Web-Search
- ✅ Multi-User-Safe (nur Message-Autor triggert AI)

### Implementierte Features
- ✅ Magic Link Authentication
- ✅ Realtime Multi-User Chat
- ✅ Persistent Message Storage
- ✅ Context-aware Claude Responses
- ✅ Multi-User-Safe AI Responses (nur Message-Autor triggert)
- 🚧 Message Threading/Replies

## 🎨 **Design System:**
- **Primary Color:** Blue (#3B82F6)
- **AI Color:** Purple (#8B5CF6) 
- **System Color:** Gray
- **Font:** Geist Sans + Geist Mono