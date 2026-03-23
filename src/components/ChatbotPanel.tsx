import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatbotPanelProps {
  padContent: string;
}

function parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>, onChunk: (text: string) => void, onDone: () => void) {
  const decoder = new TextDecoder();
  let buffer = '';

  const processStream = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onDone();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (dataStr === '[DONE]') {
              onDone();
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.choices && data.choices[0]?.delta?.content) {
                onChunk(data.choices[0].delta.content);
              }
            } catch (e) {
              console.warn('Failed to parse SSE chunk', dataStr, e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error reading stream:', e);
      onDone();
    }
  };

  processStream();
}

export default function ChatbotPanel({ padContent }: ChatbotPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    
    // Create the conversation history to send
    const convo: ChatMessage[] = [];
    
    // Inject system context invisibly 
    if (padContent) {
      convo.push({ 
        role: 'system', 
        content: `You are a helpful AI assistant built natively into SECURE_PAD. The user is currently editing a secure encrypted pad. Here is the current contents of their pad for context:\n\n=== PAD START ===\n${padContent}\n=== PAD END ===\n\nIf they ask questions, answer them based on this pad. If they ask about something else, answer normally. Keep your answers concise, formatted in markdown, and match the 'hacker' aesthetic if playfully asked.` 
      });
    }

    // Add existing history without the system message
    const historyToSent = [...convo, ...messages, { role: 'user', content: userMessage }] as ChatMessage[];
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: historyToSent })
      });

      if (!res.ok) throw new Error('Failed to generate response');
      if (!res.body) throw new Error('No response body');

      // Create a placeholder for the assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      // Decode the SSE stream
      const reader = res.body.getReader();
      parseSSEStream(
        reader,
        (textChunk) => {
          setMessages(prev => {
            const newArray = [...prev];
            const last = newArray[newArray.length - 1];
            if (last.role === 'assistant') {
              last.content += textChunk;
            }
            return newArray;
          });
        },
        () => {
          setIsTyping(false);
        }
      );

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠ Error: Secure Neural Link failed. Try again.' }]);
      setIsTyping(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 2147483647,
          background: isOpen ? 'rgba(0,0,0,0.9)' : 'rgba(0,255,65,0.1)',
          border: `1px solid ${isOpen ? '#00ff4155' : '#00ff41'}`,
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 20px rgba(0,255,65,0.2)' : '0 0 15px rgba(0,255,65,0.4)',
          transition: 'all 0.3s ease',
        }}
        title="AI Assistant"
      >
        <svg fill="none" stroke={isOpen ? '#00ff4188' : '#00ff41'} strokeWidth="1.5" viewBox="0 0 24 24" width="28" height="28">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          )}
        </svg>
      </button>

      {/* Chat Panel */}
      <div style={{
        position: 'fixed',
        bottom: 96,
        right: 24,
        width: 'calc(100% - 48px)',
        maxWidth: 380,
        height: 'calc(100% - 120px)',
        maxHeight: 600,
        boxSizing: 'border-box',
        background: 'rgba(2,2,2,0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid #00ff4133',
        borderRadius: 8,
        boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,65,0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2147483646,
        transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #00ff4122',
          background: 'rgba(0,255,65,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 8px #00ff41' }} />
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#00ff41', fontWeight: 600, letterSpacing: 1 }}>MISTRAL_AI</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#1a8c3c' }}>Contextually aware neural link</div>
          </div>
        </div>

        {/* Message List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', opacity: 0.6 }}>
              <svg fill="none" stroke="#00ff41" strokeWidth="1" viewBox="0 0 24 24" width="48" height="48" style={{ marginBottom: 12, opacity: 0.5 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
              </svg>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#00ff41', lineHeight: 1.5 }}>
                Connection established.<br/>
                I can see your pad contents.<br/>
                Query me.
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.role === 'user' ? 'rgba(0,255,65,0.1)' : 'transparent',
              border: m.role === 'user' ? '1px solid #00ff4133' : 'none',
              padding: m.role === 'user' ? '10px 14px' : '0',
              borderRadius: m.role === 'user' ? '12px 12px 0 12px' : '0',
            }}>
              {m.role === 'assistant' && (
                 <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#1a8c3c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                   <div style={{ width: 4, height: 4, background: '#00ff41', borderRadius: '50%' }} /> AI RESPONSE
                 </div>
              )}
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: 13, 
                color: m.role === 'user' ? '#fff' : '#00ff41',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textShadow: m.role === 'assistant' ? '0 0 2px rgba(0,255,65,0.3)' : 'none'
              }}>
                {m.content}
                {(isTyping && i === messages.length - 1 && m.role === 'assistant') && (
                  <span className="anim-pulse" style={{ display: 'inline-block', width: 6, height: 12, background: '#00ff41', marginLeft: 4, verticalAlign: 'middle' }} />
                )}
              </div>
            </div>
          ))}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} style={{
          padding: '16px',
          borderTop: '1px solid #00ff4122',
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          gap: 8
        }}>
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isTyping}
            style={{
              flex: 1,
              background: 'rgba(0,255,65,0.05)',
              border: '1px solid #00ff4144',
              borderRadius: 4,
              padding: '10px 14px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 13,
              outline: 'none',
              caretColor: '#00ff41'
            }}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            style={{
              background: input.trim() && !isTyping ? 'rgba(0,255,65,0.15)' : 'transparent',
              border: `1px solid ${input.trim() && !isTyping ? '#00ff4188' : '#00ff4133'}`,
              borderRadius: 4,
              width: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isTyping ? 'pointer' : 'default',
              opacity: input.trim() && !isTyping ? 1 : 0.5,
              transition: 'all 0.2s',
              color: '#00ff41'
            }}
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </form>
      </div>
    </>,
    document.body
  );
}
