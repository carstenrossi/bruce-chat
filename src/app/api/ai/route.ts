import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Server-side duplicate protection
const processingMessages = new Set<string>();

export async function POST(request: NextRequest) {
  let messageId: string | undefined;
  try {
    const body = await request.json();
    messageId = body.messageId;
    const chatRoomId = body.chatRoomId;

    if (!messageId || !chatRoomId) {
      return NextResponse.json(
        { error: 'Message ID und Chat Room ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Server-side duplicate protection
    if (processingMessages.has(messageId)) {
      console.log('🚫 Duplicate AI request blocked for message:', messageId);
      return NextResponse.json(
        { error: 'Request bereits in Bearbeitung' },
        { status: 429 }
      );
    }

    // Mark as processing
    processingMessages.add(messageId);

    // Supabase Client für Server-side
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // Aktuelle Session prüfen
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Letzte 50 Nachrichten als Kontext laden (ohne KI-Antworten um Loops zu vermeiden)
    const { data: contextMessages, error: contextError } = await supabase
      .from('messages')
      .select('content, author_name, created_at, is_ai_response')
      .eq('chat_room_id', chatRoomId)
      .eq('is_ai_response', false) // Keine KI-Antworten im Kontext
      .order('created_at', { ascending: false })
      .limit(50);

    if (contextError) {
      console.error('Fehler beim Laden des Kontexts:', contextError);
      return NextResponse.json(
        { error: 'Fehler beim Laden des Chat-Kontexts' },
        { status: 500 }
      );
    }

    // Die ursprüngliche Nachricht mit @mention laden
    const { data: originalMessage, error: messageError } = await supabase
      .from('messages')
      .select('content, author_name')
      .eq('id', messageId)
      .single();

    if (messageError || !originalMessage) {
      console.error('Fehler beim Laden der ursprünglichen Nachricht:', messageError);
      return NextResponse.json(
        { error: 'Ursprüngliche Nachricht nicht gefunden' },
        { status: 404 }
      );
    }

    // Kontext für Claude vorbereiten
    const conversationContext = contextMessages
      ?.reverse() // Chronologische Reihenfolge
      ?.map(msg => `${msg.author_name}: ${msg.content}`)
      ?.join('\n') || '';

    const prompt = `Du bist Bruce, ein hilfsreicher KI-Assistent in einem Team-Chat. Du wurdest in folgender Nachricht erwähnt:

"${originalMessage.content}" - von ${originalMessage.author_name}

Hier ist der Chat-Kontext der letzten Nachrichten:
${conversationContext}

Antworte hilfsreich, freundlich und auf Deutsch. Halte deine Antwort prägnant und relevant. Du darfst auch Emojis verwenden.`;

    // Claude API Aufruf
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const aiResponse = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : 'Entschuldigung, ich konnte keine Antwort generieren.';

    // KI-Antwort in die Datenbank speichern
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        content: aiResponse,
        author_id: session.user.id, // Technisch der User, aber als KI markiert
        author_name: 'Bruce (KI)',
        chat_room_id: chatRoomId,
        is_ai_response: true,
        mentioned_ai: false,
        parent_message_id: messageId,
      });

    if (insertError) {
      console.error('Fehler beim Speichern der KI-Antwort:', insertError);
      return NextResponse.json(
        { error: 'Fehler beim Speichern der KI-Antwort' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      response: aiResponse 
    });

  } catch (error) {
    console.error('KI API Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren der KI-Antwort' },
      { status: 500 }
    );
  } finally {
    // Clean up processing state (messageId was already extracted)
    if (messageId) {
      processingMessages.delete(messageId);
    }
  }
}