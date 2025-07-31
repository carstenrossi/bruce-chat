# 🔄 Bruce Chat - Tech Stack Migration Guide

## Von Supabase/Vercel zu anderen Stacks

### PostgreSQL + Node.js + Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bruce_chat
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./supabase-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/bruce_chat
      REDIS_URL: redis://default:${REDIS_PASSWORD}@redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

**Migration Steps:**
1. Replace Supabase client → `pg` or `knex`
2. Replace Supabase Auth → `passport-magic-link`
3. Replace Supabase Realtime → `socket.io`
4. Add Redis for sessions → `connect-redis`

### MySQL + Express + Socket.io

```javascript
// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');
const passport = require('passport');
const MagicLinkStrategy = require('passport-magic-link').Strategy;

// Database connection
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'bruce_chat'
});

// Socket.io for realtime
io.on('connection', (socket) => {
  socket.on('message:send', async (data) => {
    // Validate user
    if (data.authorId !== socket.userId) return;
    
    // Store message
    const [result] = await db.execute(
      'INSERT INTO messages (content, author_id, author_name, chat_room_id, mentioned_ai) VALUES (?, ?, ?, ?, ?)',
      [data.content, data.authorId, data.authorName, data.roomId, data.content.includes('@bruce')]
    );
    
    // Broadcast to all
    io.to(data.roomId).emit('message:new', {
      id: result.insertId,
      ...data,
      created_at: new Date()
    });
    
    // Trigger AI if mentioned by author
    if (data.content.includes('@bruce')) {
      triggerAI(result.insertId, data.roomId);
    }
  });
});
```

### MongoDB + Fastify + Mercure

```javascript
// Fastify mit MongoDB
const fastify = require('fastify')();
const { MongoClient } = require('mongodb');

// MongoDB Schema
const messageSchema = {
  _id: ObjectId,
  content: String,
  authorId: ObjectId,
  authorName: String,
  chatRoomId: ObjectId,
  isAiResponse: Boolean,
  mentionedAi: Boolean,
  parentMessageId: ObjectId,
  createdAt: Date
};

// Mercure für Realtime
const publisher = new Mercure.Publisher(
  process.env.MERCURE_PUBLISH_URL,
  { jwt: process.env.MERCURE_JWT }
);

// Message endpoint
fastify.post('/messages', async (request, reply) => {
  const { content, roomId } = request.body;
  const userId = request.user.id;
  
  // Multi-User-Safety Check
  const mentionedAi = content.includes('@bruce');
  
  const message = await db.collection('messages').insertOne({
    content,
    authorId: userId,
    authorName: request.user.name,
    chatRoomId: roomId,
    mentionedAi,
    createdAt: new Date()
  });
  
  // Publish via Mercure
  await publisher.publish(
    `https://example.com/chat/${roomId}`,
    JSON.stringify(message)
  );
  
  // Only author triggers AI
  if (mentionedAi) {
    await triggerAI(message.insertedId, roomId);
  }
});
```

## Framework-spezifische Anpassungen

### Laravel + Pusher

```php
// MessageController.php
public function store(Request $request)
{
    $user = Auth::user();
    $mentionedAi = str_contains($request->content, '@bruce');
    
    $message = Message::create([
        'content' => $request->content,
        'author_id' => $user->id,
        'author_name' => $user->name,
        'chat_room_id' => $request->room_id,
        'mentioned_ai' => $mentionedAi
    ]);
    
    // Broadcast to all users
    broadcast(new MessageSent($message))->toOthers();
    
    // Only author triggers AI
    if ($mentionedAi) {
        ProcessAIResponse::dispatch($message);
    }
    
    return response()->json($message);
}
```

### Django + Channels

```python
# consumers.py
class ChatConsumer(AsyncWebsocketConsumer):
    async def receive(self, text_data):
        data = json.loads(text_data)
        user = self.scope["user"]
        
        # Multi-User-Safety
        if data['author_id'] != str(user.id):
            return
        
        mentioned_ai = '@bruce' in data['content']
        
        # Save message
        message = await self.save_message(
            content=data['content'],
            author_id=user.id,
            author_name=user.username,
            room_id=self.room_id,
            mentioned_ai=mentioned_ai
        )
        
        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )
        
        # Only author triggers AI
        if mentioned_ai:
            await self.trigger_ai_response(message['id'])
```

### Spring Boot + WebSocket

```java
@RestController
public class ChatController {
    
    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public Message sendMessage(
        @Payload Message message,
        Principal principal
    ) {
        // Multi-User-Safety Check
        if (!message.getAuthorId().equals(principal.getName())) {
            throw new UnauthorizedException();
        }
        
        boolean mentionedAi = message.getContent().contains("@bruce");
        message.setMentionedAi(mentionedAi);
        
        // Save to database
        Message saved = messageRepository.save(message);
        
        // Only author triggers AI
        if (mentionedAi) {
            aiService.processMessage(saved.getId());
        }
        
        return saved;
    }
}
```

## Kritische Punkte bei jeder Migration

### 1. Multi-User-AI-Bug vermeiden
```javascript
// IMMER prüfen:
if (message.authorId === currentUser.id && message.mentionedAi) {
  // Nur dann AI triggern
}
```

### 2. Optimistische Updates
```javascript
// Client sendet mit temp ID
const tempId = `temp_${Date.now()}`;
sendMessage({ ...message, id: tempId });

// Server Response ersetzt temp ID
socket.on('message:confirmed', (data) => {
  replaceMessage(tempId, data.id);
});
```

### 3. Race Conditions
```javascript
// Global stores sind PFLICHT
const pendingRequests = new Set();
const debounceTimers = new Map();

// Debounce AI requests
if (debounceTimers.has(messageId)) {
  clearTimeout(debounceTimers.get(messageId));
}
debounceTimers.set(messageId, setTimeout(() => {
  if (!pendingRequests.has(messageId)) {
    pendingRequests.add(messageId);
    callAI(messageId);
  }
}, 300));
```

### 4. Database Migrations

**Von Supabase-Schema zu Standard SQL:**
```sql
-- Hauptunterschied: auth.users() existiert nicht
-- Ersetze durch eigene users Tabelle
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rest bleibt gleich, nur FK-Anpassungen
ALTER TABLE profiles 
  ADD CONSTRAINT fk_user 
  FOREIGN KEY (id) REFERENCES users(id);
```

### 5. Environment Variables Mapping

| Supabase/Vercel | Docker/Traditional |
|-----------------|-------------------|
| NEXT_PUBLIC_SUPABASE_URL | DATABASE_URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | (nicht nötig) |
| ANTHROPIC_API_KEY | ANTHROPIC_API_KEY |
| (automatisch) | SESSION_SECRET |
| (automatisch) | REDIS_URL |
| (automatisch) | WEBSOCKET_PORT |

## Test-Checkliste für Migration

1. [ ] Single-User Message Flow
2. [ ] Multi-User Realtime Updates  
3. [ ] @mention mit 1 User → 1 AI Response
4. [ ] @mention mit 2+ Users → immer noch nur 1 AI Response
5. [ ] Optimistic Updates funktionieren
6. [ ] Message-Reihenfolge bleibt konsistent
7. [ ] Auth-Flow komplett (Login/Logout)
8. [ ] PDF Export generiert korrekt
9. [ ] Chat löschen funktioniert
10. [ ] Error Handling bei Netzwerkfehlern