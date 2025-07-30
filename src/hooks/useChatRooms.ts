'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { ChatRoom } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useChatRooms(user: User | null) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchChatRooms = async () => {
      // Lade alle Chat-Räume
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Chat-Räume:', error);
      } else {
        setChatRooms(data || []);
        
        // Wähle ersten Raum als Standard oder erstelle einen
        if (data && data.length > 0) {
          setCurrentRoomId(data[0].id);
        } else {
          // Erstelle Standard-Raum falls keiner existiert
          await createDefaultRoom();
        }
      }
      setLoading(false);
    };

    fetchChatRooms();
  }, [user, supabase]);

  const createDefaultRoom = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: 'Allgemeiner Chat',
          description: 'Der Hauptchatroom für alle Team-Mitglieder',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Fehler beim Erstellen des Standard-Raums:', error);
        return null;
      }

      setChatRooms([data]);
      setCurrentRoomId(data.id);
      return data.id;
    } catch (error) {
      console.error('Fehler beim Erstellen des Standard-Raums:', error);
      return null;
    }
  };

  const createChatRoom = async (name: string, description?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: name.trim(),
          description: description?.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Fehler beim Erstellen des Chat-Raums:', error);
        return false;
      }

      setChatRooms(prev => [...prev, data]);
      setCurrentRoomId(data.id);
      return true;
    } catch (error) {
      console.error('Fehler beim Erstellen des Chat-Raums:', error);
      return false;
    }
  };

  return {
    chatRooms,
    currentRoomId,
    setCurrentRoomId,
    createChatRoom,
    loading,
  };
}