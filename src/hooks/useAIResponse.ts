'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/supabase';

// Globaler State für pending AI requests (verhindert Cross-Component Duplikate)
const pendingAIRequests = new Set<string>();

export function useAIResponse(messages: Message[], chatRoomId: string) {
  const lastProcessedMessageId = useRef<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!messages.length || !chatRoomId) return;

    // Neueste Nachricht prüfen
    const latestMessage = messages[messages.length - 1];
    
    // Prüfen ob es eine neue Mention gibt (und nicht schon verarbeitet/KI-Antwort)
    if (
      latestMessage && 
      !latestMessage.is_ai_response && 
      latestMessage.mentioned_ai &&
      lastProcessedMessageId.current !== latestMessage.id &&
      !pendingAIRequests.has(latestMessage.id) &&
      // Prüfen ob bereits eine KI-Antwort auf diese Nachricht existiert
      !messages.some(msg => 
        msg.parent_message_id === latestMessage.id && msg.is_ai_response
      )
    ) {
      // Markiere als verarbeitet SOFORT um Duplikate zu verhindern
      lastProcessedMessageId.current = latestMessage.id;
      pendingAIRequests.add(latestMessage.id);
      
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounced AI call
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('🤖 Triggering AI response for message:', latestMessage.id);
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messageId: latestMessage.id,
              chatRoomId: chatRoomId,
            }),
          });

          if (!response.ok) {
            console.error('Fehler bei KI-Antwort:', await response.text());
          }
        } catch (error) {
          console.error('Fehler beim Abrufen der KI-Antwort:', error);
        } finally {
          // Always remove from pending, regardless of success/failure
          pendingAIRequests.delete(latestMessage.id);
        }
      }, 1000); // Kürzere Verzögerung

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          // Remove from pending if cancelled
          pendingAIRequests.delete(latestMessage.id);
        }
      };
    }
  }, [messages, chatRoomId]);
}