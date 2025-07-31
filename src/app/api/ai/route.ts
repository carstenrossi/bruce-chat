import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Diese Zeile ist die entscheidende Korrektur:
// Sie zwingt Vercel, diese Funktion bei jeder Anfrage neu auszuführen
// und niemals eine gecachte Antwort zu verwenden.
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // IDEMPOTENCY CHECK
    const { data: existingResponse, error: checkError } = await supabase
      .from('messages')
      .select('id')
      .eq('parent_message_id', messageId)
      .eq('is_ai_response', true)
      .limit(1);

    if (checkError) {
      console.error('DB-Fehler bei Duplikatsprüfung:', checkError);
      return NextResponse.json({ error: 'Datenbankfehler bei Duplikatsprüfung' }, { status: 500 });
    }

    if (existingResponse && existingResponse.length > 0) {
      console.log(`✅ KI-Antwort für Nachricht ${messageId} existiert bereits. Überspringe.`);
      return NextResponse.json({ success: true, message: 'Antwort existiert bereits.' });
    }

    // KI-Logik
    const { data: contextMessages, error: contextError } = await supabase
      .from('messages')
      .select('content, author_name, is_ai_response')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (contextError) {
      console.error('Fehler beim Laden des Kontexts:', contextError);
      return NextResponse.json({ error: 'Fehler beim Laden des Chat-Kontexts' }, { status: 500 });
    }
    
    const { data: originalMessage, error: messageError } = await supabase
      .from('messages')
      .select('content, author_name')
      .eq('id', messageId)
      .single();

    if (messageError || !originalMessage) {
      console.error('Fehler beim Laden der ursprünglichen Nachricht:', messageError);
      return NextResponse.json({ error: 'Ursprüngliche Nachricht nicht gefunden' }, { status: 404 });
    }

    const conversationContext = contextMessages
      ?.reverse()
      .map(msg => {
        const author = msg.is_ai_response ? 'Bruce (KI)' : msg.author_name;
        return `${author}: ${msg.content}`;
      })
      .join('\n') || '';
    
    const shouldSearch = /such|search|aktuell|news|heute|neueste/i.test(originalMessage.content);

    const systemPrompt = `Du bist Bruce, ein hochentwickelter KI-Assistent...`; // Gekürzt zur Übersicht

    const userPrompt = `Hier ist der bisherige Chatverlauf: ...`; // Gekürzt zur Übersicht

    const messageParams: Anthropic.MessageCreateParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };

    if (shouldSearch) {
      messageParams.tools = [{
        type: "web_search_20250305",
        name: "web_search",
      }];
    }

    const response = await anthropic.messages.create(messageParams);
    
    let aiResponse = '';
    // ... (restlicher Code bleibt gleich)

  } catch (error) {
    console.error('KI API Fehler:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der KI-Antwort' }, { status: 500 });
  }
}
