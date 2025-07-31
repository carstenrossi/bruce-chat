'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Globaler State für pending AI requests (verhindert Cross-Component Duplikate und schnelle Re-Renders)
const pendingAIRequests = new Set<string>();

// KRITISCH: Globaler State für verarbeitete Messages pro Room (überlebt Component Re-Mounts)
const processedMessagesPerRoom = new Map<string, Set<string>>();

// Globaler AbortController Store für Hook-Instanzen
const abortControllers = new Map<string, AbortController>();

// Globaler Debounce-Timer Store für Messages
const messageDebounceTimers = new Map<string, NodeJS.Timeout>();

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

export function useAIResponse(messages: Message[], chatRoomId: string, currentUser: User | null) {
  const instanceId = useRef(`instance_${Math.random()}`).current;
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    console.log(`🔍 useAIResponse triggered - instanceId: ${instanceId}, chatRoomId: ${chatRoomId}, messages.length: ${messages.length}, user: ${currentUser?.email}, mountTime: ${Date.now() - mountTimeRef.current}ms`);
    if (!chatRoomId || messages.length === 0 || !currentUser) return;
    
    // Hole oder erstelle das Set für diesen Room
    if (!processedMessagesPerRoom.has(chatRoomId)) {
      processedMessagesPerRoom.set(chatRoomId, new Set<string>());
    }
    const processedMessages = processedMessagesPerRoom.get(chatRoomId)!;

    // WICHTIG: Finde ALLE neuen User-Messages mit @mentions vom AKTUELLEN USER
    const newUserMessagesWithMentions = messages.filter(msg => 
      !msg.is_ai_response && 
      msg.mentioned_ai && 
      msg.author_id === currentUser.id &&  // NUR Messages vom aktuellen User!
      !msg.id.startsWith('temp_') &&
      !processedMessages.has(msg.id) &&
      !pendingAIRequests.has(msg.id)
    );

    console.log(`📊 Found ${newUserMessagesWithMentions.length} new user messages with mentions from current user (${currentUser.email})`);
    console.log(`📊 Processed messages: ${Array.from(processedMessages).join(', ')}`);
    console.log(`📊 Pending requests: ${Array.from(pendingAIRequests).join(', ')}`);
    
    // Verarbeite nur neue Messages
    for (const message of newUserMessagesWithMentions) {
      console.log(`🎯 Processing new mention: ${message.id}`);
      
      // KRITISCH: Atomare Lock-Operation verhindert Race Conditions
      if (!tryLockMessage(message.id)) {
        console.log(`🔒 Message ${message.id} wird bereits verarbeitet (Race Condition verhindert)`);
        continue;
      }
      console.log(`🔐 Message ${message.id} erfolgreich gesperrt`);
      
      // Zur processedMessages hinzufügen, um zukünftige Duplikate zu verhindern
      processedMessages.add(message.id);
      
      // Prüfen, ob in der aktuellen Nachrichtenliste bereits eine Antwort existiert
      const hasResponse = messages.some(
        (msg) => msg.parent_message_id === message.id && msg.is_ai_response
      );

      if (hasResponse) {
        console.log(`✅ Antwort für Nachricht ${message.id} bereits im Chat vorhanden.`);
        pendingAIRequests.delete(message.id); // Cleanup da keine Anfrage nötig
        continue;
      }
      console.log(`🤖 Triggering AI response für Nachricht: ${message.id} (Instance: ${instanceId})`);

      // Clear any existing debounce timer for this message
      if (messageDebounceTimers.has(message.id)) {
        clearTimeout(messageDebounceTimers.get(message.id));
      }

      // Debounce die Anfrage um Race Conditions zu vermeiden
      const debounceTimer = setTimeout(() => {
        console.log(`⏱️ Debounce abgelaufen, starte AI-Request für ${message.id}`);
        
        // Double-Check: Prüfe nochmal ob noch nicht verarbeitet
        if (!pendingAIRequests.has(message.id)) {
          console.log(`❌ Message ${message.id} wurde während Debounce bereits verarbeitet`);
          messageDebounceTimers.delete(message.id);
          return;
        }

        // Erstelle einen AbortController für diese Anfrage
        const abortController = new AbortController();
        const abortKey = `${chatRoomId}_${message.id}`;
        
        // Cancel vorherige Anfrage für dieselbe Message falls vorhanden
        if (abortControllers.has(abortKey)) {
          console.log(`🚫 Cancelling previous request for ${abortKey}`);
          abortControllers.get(abortKey)?.abort();
        }
        abortControllers.set(abortKey, abortController);

        fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: message.id,
            chatRoomId: chatRoomId,
          }),
          signal: abortController.signal,
        })
        .then(async (response) => {
          if (!response.ok) {
            console.error('Fehler bei KI-Antwort:', await response.text());
          } else {
            console.log(`✅ AI-Anfrage für ${message.id} erfolgreich abgeschlossen. (Instance: ${instanceId})`);
          }
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log(`⏹️ AI-Anfrage für ${message.id} wurde abgebrochen (Instance: ${instanceId})`);
          } else {
            console.error('Fehler beim Abrufen der KI-Antwort:', error);
          }
        })
        .finally(() => {
          // Anfrage aus dem Set entfernen, egal ob erfolgreich oder nicht
          pendingAIRequests.delete(message.id);
          abortControllers.delete(abortKey);
          messageDebounceTimers.delete(message.id);
        });
      }, 300); // 300ms Debounce

      messageDebounceTimers.set(message.id, debounceTimer);
    }
  }, [messages, chatRoomId, currentUser, instanceId]); // Messages-Dependency ist OK, weil wir frühe Returns für AI-Messages haben
  
  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      console.log(`🧹 Cleaning up useAIResponse instance: ${instanceId}`);
      // Breche alle laufenden Requests dieser Instanz ab
      abortControllers.forEach((controller, key) => {
        if (key.startsWith(chatRoomId)) {
          console.log(`🚫 Aborting request on unmount: ${key}`);
          controller.abort();
        }
      });
      // Clear alle Debounce Timer
      messageDebounceTimers.forEach((timer, messageId) => {
        console.log(`⏱️ Clearing debounce timer for message: ${messageId}`);
        clearTimeout(timer);
      });
      messageDebounceTimers.clear();
    };
  }, [chatRoomId, instanceId]);

}
