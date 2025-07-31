-- Bruce Chat Database Schema
-- Führe diese SQL-Befehle in deinem Supabase SQL Editor aus

-- 1. Profiles Tabelle (für User-Management)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Chat Rooms Tabelle
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Messages Tabelle
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  is_ai_response BOOLEAN DEFAULT FALSE,
  mentioned_ai BOOLEAN DEFAULT FALSE,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS (Row Level Security) aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies erstellen

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat Rooms Policies
CREATE POLICY "Chat rooms are viewable by everyone" ON chat_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own chat rooms" ON chat_rooms
  FOR UPDATE USING (auth.uid() = created_by);

-- Messages Policies
CREATE POLICY "Messages are viewable by everyone" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert messages" ON messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete any message" ON messages
  FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Trigger für updated_at Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Realtime für Messages aktivieren (für Live-Chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 8. Standardraum erstellen
INSERT INTO chat_rooms (name, description, created_by) 
SELECT 
  'Allgemeiner Chat', 
  'Der Hauptchatroom für alle Team-Mitglieder', 
  id 
FROM profiles 
LIMIT 1
ON CONFLICT DO NOTHING;

-- 9. Function für automatische Profile-Erstellung bei Anmeldung
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger für automatische Profile-Erstellung
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();