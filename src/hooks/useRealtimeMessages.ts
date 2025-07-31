'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAIResponse } from './useAIResponse';
import type { Message } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useRealtimeMessages(chatRoomId: string, user: User | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // KI-Antworten bei @mentions aktivieren
  useAIResponse(messages, chatRoomId);

  // Lade initiale Nachrichten
  useEffect(() => {
    if (!chatRoomId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Nachrichten:', error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();
  }, [chatRoomId, supabase]);

  // Realtime Subscription für neue Nachrichten
  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel(`messages:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Verhindere, dass die eigene Nachricht doppelt hinzugefügt wird
          if (newMessage.author_id !== user?.id) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, supabase, user]);

  // Sende neue Nachricht
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const messageToInsert = {
        content: content.trim(),
        author_id: user.id,
        author_name: user.email?.split('@')[0] || 'Unbekannt',
        chat_room_id: chatRoomId,
        mentioned_ai: content.toLowerCase().includes('@bruce') || content.toLowerCase().includes('@ki'),
      };

      // Optimistisches Update: Füge die Nachricht sofort zum lokalen State hinzu
      const tempId = `temp_${Date.now()}`;
      const optimisticMessage: Message = {
        ...messageToInsert,
        id: tempId,
        created_at: new Date().toISOString(),
        is_ai_response: false,
        parent_message_id: null,
      };
      setMessages(prev => [...prev, optimisticMessage]);

      const { data, error } = await supabase
        .from('messages')
        .insert(messageToInsert)
        .select()
        .single();

      if (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
        // Rollback bei Fehler
        setMessages(prev => prev.filter(m => m.id !== tempId));
        return false;
      }

      // Ersetze die temporäre Nachricht durch die echte aus der DB
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      return false;
    }
  };

  // Chat leeren
  const clearMessages = async (): Promise<boolean> => {
    if (!chatRoomId) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('chat_room_id', chatRoomId);

      if (error) {
        console.error('Fehler beim Löschen der Nachrichten:', error);
        return false;
      }

      setMessages([]);
      return true;
    } catch (error) {
      console.error('Fehler beim Löschen der Nachrichten:', error);
      return false;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
  };
}
