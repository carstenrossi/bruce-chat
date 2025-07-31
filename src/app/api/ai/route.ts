import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Verhindere Caching für diese API-Route - jede Anfrage muss frisch verarbeitet werden
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

    // IDEMPOTENCY CHECK: Prüfen, ob für diese Nachricht bereits eine KI-Antwort existiert
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

    // KI-Logik ab hier...
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

    const systemPrompt = `Du bist Bruce, ein hochentwickelter KI-Assistent in einem Team-Chat. Deine Hauptaufgabe ist es, präzise, hilfreiche und kohärente Antworten zu liefern. Halte dich strikt an die folgenden Verhaltensregeln:
1. Vermeide Wiederholungen: Wiederhole niemals Informationen, die du oder ein anderer Benutzer bereits in den letzten Nachrichten erwähnt haben. Fasse dich kurz und bringe immer neue Aspekte oder Informationen ein.
2. Sei selbstkritisch: Wenn ein Benutzer dich korrigiert oder auf einen Fehler in deiner vorherigen Antwort hinweist, akzeptiere die Korrektur. Behandle die Information des Benutzers als die neue Wahrheit. Argumentiere nicht dagegen.
3. Baue auf dem Kontext auf: Nutze den gesamten Gesprächsverlauf, einschließlich deiner eigenen früheren Antworten, um den Faden der Konversation aufrechtzuerhalten und kontextbezogen zu antworten.
4. Bleibe beim Thema: Konzentriere dich immer auf die letzte Frage oder Anweisung des Benutzers. Drifte nicht zu verwandten, aber irrelevanten Themen ab.
5. Grundton: Antworte wie immer hilfsreich, freundlich und auf Deutsch. Du darfst Emojis verwenden, um deine Antworten natürlicher zu gestalten.`;

    const userPrompt = `Hier ist der bisherige Chatverlauf:
---
${conversationContext}
---
Ich (${originalMessage.author_name}) habe dich gerade erwähnt: "${originalMessage.content}"
Bitte antworte jetzt darauf.`;

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
    const citations: string[] = [];
    if (response.content && Array.isArray(response.content)) {
      for (const content of response.content) {
        if (content.type === 'text') {
          aiResponse += content.text;
          if ('citations' in content && Array.isArray(content.citations)) {
            for (const citation of content.citations) {
              if (citation.type === 'web_search_result_location') {
                const citationText = `[${citation.title}](${citation.url})`;
                if (!citations.includes(citationText)) {
                  citations.push(citationText);
                }
              }
            }
          }
        }
      }
    }

    if (citations.length > 0) {
      aiResponse += '\n\n**Quellen:**\n' + citations.map((c, i) => `${i + 1}. ${c}`).join('\n');
    }
    
    if (!aiResponse) {
      aiResponse = 'Entschuldigung, ich konnte keine Antwort generieren.';
    }

    const { error: insertError } = await supabase.from('messages').insert({
      content: aiResponse,
      author_id: session.user.id,
      author_name: 'Bruce (KI)',
      chat_room_id: chatRoomId,
      is_ai_response: true,
      mentioned_ai: false,
      parent_message_id: messageId,
    });

    if (insertError) {
      console.error('Fehler beim Speichern der KI-Antwort:', insertError);
      return NextResponse.json({ error: 'Fehler beim Speichern der KI-Antwort' }, { status: 500 });
    }

    return NextResponse.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('KI API Fehler:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der KI-Antwort' }, { status: 500 });
  }
}
