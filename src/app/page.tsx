'use client';

import { useState } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import AuthButton from '@/components/AuthButton';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

// Hilfsfunktion, um Markdown zu reinigen, Links zu extrahieren und nicht-darstellbare Zeichen zu entfernen
const cleanTextForPdf = (text: string): string => {
  return text
    // Ersetze Markdown-Links durch "Titel: URL"
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
    // Entferne fette Schrift und andere Markdown-Formatierungen
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // Entferne Emojis und andere komplexe Unicode-Zeichen, die jspdf nicht standardmäßig unterstützt
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
};

export default function ChatPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { currentRoomId, loading: roomsLoading } = useChatRooms(user);
  const { messages, loading: messagesLoading, sendMessage, clearMessages } = useRealtimeMessages(currentRoomId, user);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    const content = newMessage;
    setNewMessage('');
    const success = await sendMessage(content);
    if (!success) {
      setNewMessage(content);
      alert('Fehler beim Senden der Nachricht. Bitte versuche es erneut.');
    }
    setSending(false);
  };

  const handleClearChat = async () => {
    if (!user) return;
    const confirmed = window.confirm('Möchtest du wirklich alle Nachrichten löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
    if (confirmed) {
      const success = await clearMessages();
      if (!success) {
        alert('Fehler beim Löschen der Nachrichten. Bitte versuche es erneut.');
      }
    }
  };

  const handleExportToPdf = () => {
    if (messages.length === 0 || isExporting) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF();
      let y = 15;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      const lineHeight = 7; // Mehr Platz pro Zeile

      const printLine = (text: string, font: 'bold' | 'normal' = 'normal') => {
        const lines = doc.splitTextToSize(text, doc.internal.pageSize.width - margin * 2);
        doc.setFont('Helvetica', font);

        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });
      };

      printLine('Bruce Chat - Chat-Protokoll', 'bold');
      y += lineHeight;

      messages.forEach(message => {
        const timestamp = new Date(message.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const author = `${message.author_name}${message.is_ai_response ? ' (KI)' : ''}`;
        const header = `${author} (${timestamp}):`;
        const cleanedContent = cleanTextForPdf(message.content);

        // Prüfen, ob der gesamte Block auf die Seite passt, sonst neue Seite beginnen
        const headerLines = doc.splitTextToSize(header, doc.internal.pageSize.width - margin * 2);
        const contentLines = doc.splitTextToSize(cleanedContent, doc.internal.pageSize.width - margin * 2);
        const blockHeight = (headerLines.length + contentLines.length) * lineHeight;

        if (y + blockHeight > pageHeight - margin && y > 20) { // y > 20 verhindert Seitenumbruch direkt nach Titel
            doc.addPage();
            y = margin;
        }
        
        printLine(header, 'bold');
        printLine(cleanedContent, 'normal');
        y += lineHeight / 2; // Extra Abstand nach jeder Nachricht
      });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`bruce-chat-export-${date}.pdf`);

    } catch (error) {
      console.error("Fehler beim Erstellen des PDFs:", error);
      alert("Entschuldigung, beim Erstellen des PDFs ist ein Fehler aufgetreten.");
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || roomsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Bruce Chat lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bruce Chat 💬</h1>
            <p className="text-sm text-gray-600">Kollaborativer Chat mit KI-Integration</p>
          </div>
          <div className="flex gap-2 items-center">
             {user && messages.length > 0 && (
              <>
                <button
                  onClick={handleExportToPdf}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isExporting}
                  title="Chat als PDF exportieren"
                >
                  {isExporting ? 'Exportiere...' : '📥 PDF Export'}
                </button>
                <button
                  onClick={handleClearChat}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  title="Chat leeren"
                >
                  🗑️ Chat leeren
                </button>
              </>
            )}
            <AuthButton />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4" id="chat-container">
        <div className="max-w-4xl mx-auto space-y-4">
          {messagesLoading ? (
            <div className="text-center text-gray-500">
              <div className="animate-pulse">Nachrichten werden geladen...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg">👋 Willkommen im Bruce Chat!</p>
              <p className="text-sm mt-2">Schreibe die erste Nachricht oder erwähne @bruce/@ki für eine KI-Antwort.</p>
              <p className="text-xs mt-2 text-gray-400">
                💡 Tipp: Nutze Wörter wie &quot;suche&quot;, &quot;aktuell&quot;, &quot;news&quot; oder &quot;heute&quot; für Web-Suche!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.author_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`prose prose-sm max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.author_id === user?.id
                      ? 'bg-blue-500 text-white prose-invert'
                      : message.is_ai_response
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 not-prose">
                    <span className="text-xs font-semibold">
                      {message.author_name}
                      {message.is_ai_response && ' 🤖'}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                   <ReactMarkdown
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline" />,
                        p: ({node, ...props}) => <p {...props} className="m-0" />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={user ? "Nachricht schreiben... (@bruce oder @ki für KI-Antwort)" : "Bitte anmelden um zu chatten"}
              disabled={!user}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !user || sending}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '...' : 'Senden'}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            {user 
              ? "💡 Tipp: Verwende @bruce oder @ki um die KI zu erwähnen"
              : "🔐 Melde dich an um am Chat teilzunehmen"
            }
          </p>
        </div>
      </footer>
    </div>
  );
}
