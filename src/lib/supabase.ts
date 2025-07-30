import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase client
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_rooms: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          author_id: string
          author_name: string
          chat_room_id: string
          is_ai_response: boolean
          mentioned_ai: boolean
          parent_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          author_id: string
          author_name: string
          chat_room_id: string
          is_ai_response?: boolean
          mentioned_ai?: boolean
          parent_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          author_id?: string
          author_name?: string
          chat_room_id?: string
          is_ai_response?: boolean
          mentioned_ai?: boolean
          parent_message_id?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ChatRoom = Database['public']['Tables']['chat_rooms']['Row']
export type Message = Database['public']['Tables']['messages']['Row']