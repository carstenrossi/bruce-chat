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
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, supabase]);

  // Sende neue Nachricht
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const { error } = await supabase.from('messages').insert({
        content: content.trim(),
        author_id: user.id,
        author_name: user.email?.split('@')[0] || 'Unbekannt',
        chat_room_id: chatRoomId,
        mentioned_ai: content.toLowerCase().includes('@bruce') || content.toLowerCase().includes('@ki'),
      });

      if (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      return false;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
  };
}