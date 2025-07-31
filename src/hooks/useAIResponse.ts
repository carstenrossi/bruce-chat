'use client';

import { useEffect } from 'react';
import type { Message } from '@/lib/supabase';

// Globaler State für pending AI requests (verhindert Cross-Component Duplikate und schnelle Re-Renders)
const pendingAIRequests = new Set<string>();

// KRITISCH: Globaler State für verarbeitete Messages pro Room (überlebt Component Re-Mounts)
const processedMessagesPerRoom = new Map<string, Set<string>>();

// Atomare Funktion zum Prüfen und Sperren in einem Schritt
function tryLockMessage(messageId: string): boolean {
  console.log(`🔍 tryLockMessage(${messageId}) - Current locks: ${Array.from(pendingAIRequests).join(', ')}`);
  if (pendingAIRequests.has(messageId)) {
    console.log(`❌ Message ${messageId} ist bereits gesperrt`);
    return false; // Bereits gesperrt
  }
  pendingAIRequests.add(messageId);
  console.log(`✅ Message ${messageId} erfolgreich gesperrt. New locks: ${Array.from(pendingAIRequests).join(', ')}`);
  return true; // Erfolgreich gesperrt
}

export function useAIResponse(messages: Message[], chatRoomId: string) {

  useEffect(() => {
    console.log(`🔍 useAIResponse triggered - chatRoomId: ${chatRoomId}, messages.length: ${messages.length}`);
    if (!chatRoomId || messages.length === 0) return;
    
    // Hole oder erstelle das Set für diesen Room
    if (!processedMessagesPerRoom.has(chatRoomId)) {
      processedMessagesPerRoom.set(chatRoomId, new Set<string>());
    }
    const processedMessages = processedMessagesPerRoom.get(chatRoomId)!;

    const latestMessage = messages[messages.length - 1];
    console.log(`📊 Latest message: id=${latestMessage?.id}, is_ai=${latestMessage?.is_ai_response}, mentioned=${latestMessage?.mentioned_ai}`);
    console.log(`📊 Processed messages: ${Array.from(processedMessages).join(', ')}`);
    
    // KRITISCH: Nur auf neue User-Messages reagieren, nicht auf AI-Antworten!
    if (!latestMessage || latestMessage.is_ai_response) return;
    
    // KRITISCH: Ignoriere temporäre/optimistic Messages (temp_ prefix)
    if (latestMessage.id.startsWith('temp_')) {
      console.log(`⏭️ Ignoring optimistic message: ${latestMessage.id}`);
      return;
    }
    
    // Prüfen, ob eine neue, vom Benutzer erstellte Erwähnung vorliegt
    if (
      latestMessage &&
      !latestMessage.is_ai_response &&
      latestMessage.mentioned_ai
    ) {
      // KRITISCH: Atomare Lock-Operation verhindert Race Conditions
      if (!tryLockMessage(latestMessage.id)) {
        console.log(`🔒 Message ${latestMessage.id} wird bereits verarbeitet (Race Condition verhindert)`);
        return;
      }
      console.log(`🔐 Message ${latestMessage.id} erfolgreich gesperrt`);
      
      // Sekundäre Prüfung mit processedMessages
      if (processedMessages.has(latestMessage.id)) {
        console.log(`✅ Message ${latestMessage.id} wurde bereits verarbeitet`);
        pendingAIRequests.delete(latestMessage.id); // Cleanup
        return;
      }

      // Prüfen, ob in der aktuellen Nachrichtenliste bereits eine Antwort existiert.
      const hasResponse = messages.some(
        (msg) => msg.parent_message_id === latestMessage.id && msg.is_ai_response
      );

      if (hasResponse) {
        console.log(`✅ Antwort für Nachricht ${latestMessage.id} bereits im Chat vorhanden.`);
        pendingAIRequests.delete(latestMessage.id); // Cleanup da keine Anfrage nötig
        return;
      }
      
      // Zur processedMessages hinzufügen, um zukünftige Duplikate zu verhindern
      processedMessages.add(latestMessage.id);
      console.log(`🤖 Triggering AI response für Nachricht: ${latestMessage.id}`);

      fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: latestMessage.id,
          chatRoomId: chatRoomId,
        }),
      })
      .then(async (response) => {
        if (!response.ok) {
          console.error('Fehler bei KI-Antwort:', await response.text());
        } else {
          console.log(`✅ AI-Anfrage für ${latestMessage.id} erfolgreich abgeschlossen.`);
        }
      })
      .catch((error) => {
        console.error('Fehler beim Abrufen der KI-Antwort:', error);
      })
      .finally(() => {
        // Anfrage aus dem Set entfernen, egal ob erfolgreich oder nicht
        pendingAIRequests.delete(latestMessage.id);
      });
    }
  }, [messages, chatRoomId]); // Messages-Dependency ist OK, weil wir frühe Returns für AI-Messages haben
  

}
