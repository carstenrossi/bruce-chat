# 🚀 Deployment Instructions für Bruce Chat

## ✅ Schritt 1: Supabase Projekt Setup

1. **Gehe zu [supabase.com](https://supabase.com/new)**
2. **Erstelle neues Projekt:** "bruce-chat"
3. **Warte auf Setup** (ca. 2-3 Minuten)
4. **Gehe zu SQL Editor** und führe die gesamte `supabase-schema.sql` aus
5. **Notiere dir:**
   - `Project URL` (Settings → API)
   - `anon/public key` (Settings → API)

## ✅ Schritt 2: Anthropic API Key

1. **Gehe zu [console.anthropic.com](https://console.anthropic.com/)**
2. **Erstelle Account** oder logge dich ein
3. **API Keys → Create Key**
4. **Notiere den Key** (beginnt mit `sk-ant-...`)

## ✅ Schritt 3: Vercel Deployment

### Option A: Mit Git (empfohlen)
```bash
# 1. Git Repository erstellen
git add .
git commit -m "Initial Bruce Chat setup"
git remote add origin https://github.com/dein-username/bruce-chat.git
git push -u origin main

# 2. Zu Vercel.com gehen
# 3. "New Project" → Repository importieren
# 4. Environment Variables setzen (siehe unten)
# 5. Deploy!
```

### Option B: Vercel CLI
```bash
# 1. Vercel CLI installieren
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Environment Variables setzen
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  
vercel env add ANTHROPIC_API_KEY
```

## ✅ Schritt 4: Environment Variables in Vercel

Gehe zu **Vercel Dashboard → Dein Projekt → Settings → Environment Variables:**

```
NEXT_PUBLIC_SUPABASE_URL = https://deinprojekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY = sk-ant-api03-...
```

## ✅ Schritt 5: Supabase Auth Setup

1. **Gehe zu Supabase Dashboard → Authentication → Settings**
2. **Site URL setzen:** `https://deine-app.vercel.app`
3. **Redirect URLs hinzufügen:**
   ```
   https://deine-app.vercel.app/auth/callback
   https://deine-app.vercel.app
   ```

## ✅ Schritt 6: Teste deine App!

1. **Öffne deine Vercel URL**
2. **Teste Magic Link Login**
3. **Schreibe eine Nachricht**
4. **Teste @bruce mention**

---

## 🔧 Nach dem Deployment

### Performance Monitoring
- **Vercel Analytics:** Automatisch aktiviert
- **Supabase Monitoring:** Dashboard verfügbar

### Updates deployen
```bash
git add .
git commit -m "Update message"
git push
# Vercel deployed automatisch!
```

### Kosten Übersicht
- **Vercel:** $0 für Hobby (bis 100GB Bandwidth)
- **Supabase:** $0 für bis zu 50MB DB + 500MB Bandwidth
- **Anthropic:** ~$0.01 pro 1000 KI-Nachrichten

---

## 🆘 Troubleshooting

**❌ "Environment not loaded"**
→ Prüfe Environment Variables in Vercel

**❌ "Database connection failed"** 
→ Prüfe Supabase URL und Keys

**❌ "Authentication failed"**
→ Prüfe Site URL und Redirect URLs in Supabase

**❌ "KI antwortet nicht"**
→ Prüfe Anthropic API Key und Logs in Vercel

---

## 🎉 Fertig!

Dein Bruce Chat ist jetzt live! 🚀

**Teile den Link mit deinem Team und los geht's!**