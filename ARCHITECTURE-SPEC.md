# 🏗️ Bruce Chat - Technologie-agnostische Architektur-Spezifikation

## Executive Summary

Eine Echtzeit-Chat-Anwendung mit KI-Integration, die nur auf explizite Erwähnungen (@mentions) antwortet. Die App unterstützt mehrere gleichzeitige Benutzer, persistente Nachrichten und Web-Search-fähige KI-Antworten.

## Core Features

### 1. Echtzeit-Messaging
- **Requirement:** Bidirektionale Echtzeit-Kommunikation zwischen allen verbundenen Clients
- **Pattern:** WebSocket oder Server-Sent Events (SSE)
- **Critical:** Optimistische UI-Updates mit Rollback bei Fehler
- **Data Flow:**
  ```
  Client A → Server → Database → Broadcast → All Clients
  ```

### 2. KI-Integration mit @Mentions
- **Requirement:** KI antwortet NUR wenn explizit mit @bruce oder @ki erwähnt
- **Critical Bug Fix:** NUR der Autor der Nachricht triggert die KI-Response
- **Implementation:**
  ```javascript
  // KRITISCH: Multi-User Safety
  if (message.mentions_ai && message.author_id === current_user.id) {
    triggerAIResponse(message);
  }
  ```
- **AI Context:** Letzte 50 Nachrichten (inkl. KI-Antworten für Kontext-Kontinuität)
- **Debouncing:** 300ms Verzögerung vor API-Call

### 3. Authentication
- **Pattern:** Passwordless (Magic Link) oder OAuth
- **Requirements:** 
  - Session Management
  - Auto-Profile-Creation bei erster Anmeldung
  - JWT oder Session-basiert

## Data Models

### Users/Profiles
```typescript
interface Profile {
  id: UUID;                    // User ID
  email: string;               // Unique
  full_name?: string;
  avatar_url?: string;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Messages
```typescript
interface Message {
  id: UUID;
  content: string;
  author_id?: UUID;            // NULL für AI-Nachrichten!
  author_name: string;
  chat_room_id: UUID;
  is_ai_response: boolean;
  mentioned_ai: boolean;
  parent_message_id?: UUID;    // Für Threading
  created_at: timestamp;
}
```

### Chat Rooms
```typescript
interface ChatRoom {
  id: UUID;
  name: string;
  description?: string;
  created_by: UUID;
  created_at: timestamp;
  updated_at: timestamp;
}
```

## Critical Implementation Details

### 1. Message Flow Architecture
```
1. User types message
2. Client creates optimistic message (temp_id)
3. Client sends to server
4. Server validates & stores in DB
5. Server broadcasts to all clients via WebSocket/SSE
6. Clients update optimistic message with real ID
7. If @mention detected AND user is author → trigger AI
```

### 2. AI Response Flow
```
1. Detect @mention in new message
2. Check if current_user === message.author (CRITICAL!)
3. Debounce 300ms
4. Fetch last 50 messages (all) as context
5. Call AI API with context
6. Store AI response with author_id = NULL
7. Broadcast AI message to all clients
```

### 3. Realtime Subscription Pattern
```javascript
// Pseudo-code for any realtime solution
subscribe('messages', { chat_room_id: roomId }, (payload) => {
  const newMessage = payload.data;
  
  // Prevent duplicates from optimistic updates
  if (!messageExists(newMessage.id)) {
    addMessage(newMessage);
  }
});
```

## State Management

### Client State
```typescript
interface ClientState {
  user: Profile | null;
  messages: Message[];
  currentRoomId: string;
  pendingMessages: Set<string>;    // For optimistic updates
  processedAIRequests: Set<string>; // Prevent duplicate AI calls
}
```

### Global Stores (Critical for Multi-User Safety)
```javascript
// These MUST be global/singleton
const pendingAIRequests = new Set();      // Active AI requests
const processedMessages = new Map();      // Per-room processed messages
const abortControllers = new Map();       // For request cancellation
```

## API Endpoints

### 1. Authentication
- `POST /auth/login` - Initiate magic link or OAuth
- `GET /auth/callback` - Handle auth callback
- `POST /auth/logout` - Clear session

### 2. Messages
- `GET /messages?room_id={id}&limit=50` - Fetch messages
- `POST /messages` - Send new message
- `DELETE /messages` - Clear chat (soft delete recommended)

### 3. AI Integration
- `POST /api/ai` - Trigger AI response
  ```json
  {
    "messageId": "uuid",
    "chatRoomId": "uuid"
  }
  ```

## Security Considerations

### 1. Row-Level Security (RLS)
- Users can only update their own profile
- All users can read all messages in joined rooms
- Only message authors can trigger AI responses
- AI messages have NULL author_id

### 2. Rate Limiting
- AI API calls: Max 10 per user per minute
- Message sending: Max 100 per user per minute
- WebSocket connections: Max 5 per user

## Performance Optimizations

### 1. Database Indexes
```sql
CREATE INDEX idx_messages_room_created ON messages(chat_room_id, created_at DESC);
CREATE INDEX idx_messages_author ON messages(author_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
```

### 2. Caching Strategy
- Cache last 50 messages per room in memory
- Cache user profiles for 5 minutes
- Invalidate on updates

### 3. Connection Management
- Implement reconnection logic with exponential backoff
- Clean up abandoned connections after 30s
- Use connection pooling for database

## Deployment Architecture

### Option 1: Containerized (Docker)
```yaml
services:
  app:
    - Node.js/React app
    - Environment variables for config
  database:
    - PostgreSQL/MySQL with persistent volume
  redis:
    - For session storage and caching
  nginx:
    - Reverse proxy and static file serving
```

### Option 2: Serverless
- Frontend: Static hosting (Vercel, Netlify, S3+CloudFront)
- API: Lambda/Cloud Functions
- Database: Managed PostgreSQL (RDS, Cloud SQL)
- Realtime: Managed WebSocket service (Pusher, Ably)

## Migration Guide from Reference Implementation

### From Supabase to Standard PostgreSQL
1. Replace Supabase client with pg/knex/prisma
2. Implement own auth (Passport.js, Auth0)
3. Add WebSocket server (Socket.io, ws)
4. Implement RLS as middleware functions

### From Vercel to Docker
1. Create Dockerfile for Next.js app
2. Add docker-compose.yml for services
3. Use environment variables for all configs
4. Add health check endpoints

## Common Pitfalls to Avoid

1. **Multi-User AI Triggering** - Always check message author
2. **Race Conditions** - Use debouncing and request locks
3. **Duplicate Messages** - Check message ID before adding
4. **Memory Leaks** - Clean up subscriptions and timers
5. **N+1 Queries** - Batch fetch user profiles

## Testing Strategy

### Unit Tests
- Message mention detection
- AI context building
- Auth flows

### Integration Tests
- Multi-user message flow
- AI response triggering
- Realtime updates

### E2E Tests (Critical)
- Multi-browser session test
- AI mention with 2+ users
- Message ordering consistency

## Monitoring & Logging

### Key Metrics
- AI response time and success rate
- WebSocket connection count
- Message delivery latency
- Active user count

### Critical Logs
```javascript
console.log(`[AI] Request for message ${id} by user ${userId}`);
console.log(`[Realtime] Broadcasting to ${clientCount} clients`);
console.log(`[Auth] New user registered: ${email}`);
```

---

Diese Spezifikation sollte es jeder kompetenten Coding-KI ermöglichen, Bruce Chat in jeder modernen Web-Stack-Umgebung zu implementieren.