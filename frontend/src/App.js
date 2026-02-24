import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { sendMessage, listSessions } from './api';
import './App.css';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator() {
  return (
    <div className="message assistant">
      <div className="avatar">AI</div>
      <div className="bubble typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || (() => {
      const id = uuidv4();
      localStorage.setItem('sessionId', id);
      return id;
    })();
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data.sessions);
    } catch {}
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, messages]);

  const startNewChat = () => {
    const id = uuidv4();
    setSessionId(id);
    localStorage.setItem('sessionId', id);
    setMessages([]);
    setError('');
    setSidebarOpen(false);
  };

  const switchSession = (id) => {
    setSessionId(id);
    localStorage.setItem('sessionId', id);
    setMessages([]);
    setError('');
    setSidebarOpen(false);
    // Load messages for this session from history
    import('./api').then(({ fetchConversation }) => {
      fetchConversation(id).then(data => {
        const msgs = data.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        }));
        setMessages(msgs);
      }).catch(() => setMessages([]));
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError('');

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(sessionId, text);
      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        tokensUsed: data.tokensUsed,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const shortId = sessionId.slice(0, 8);

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Sessions</span>
          <button className="icon-btn close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <button className="new-chat-btn" onClick={startNewChat}>
          <span>+</span> New Chat
        </button>
        <div className="sessions-list">
          {sessions.length === 0 && <p className="empty-sessions">No sessions yet</p>}
          {sessions.map(s => (
            <button
              key={s.id}
              className={`session-item ${s.id === sessionId ? 'active' : ''}`}
              onClick={() => switchSession(s.id)}
            >
              <span className="session-id">#{s.id.slice(0, 8)}</span>
              <span className="session-meta">{s.message_count} msgs · {formatDate(s.updated_at)}</span>
            </button>
          ))}
        </div>
      </div>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main chat area */}
      <div className="main">
        {/* Header */}
        <header className="chat-header">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="header-center">
            <span className="header-logo">◈</span>
            <span className="header-title">Support Assistant</span>
          </div>
          <div className="header-right">
            <span className="session-badge">#{shortId}</span>
            <button className="new-chat-pill" onClick={startNewChat}>New Chat</button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <h2 className="empty-title">How can I help you today?</h2>
              <p className="empty-sub">Ask me about passwords, subscriptions, refunds, API access, and more.</p>
              <div className="suggestions">
                {['How do I reset my password?', 'What is the refund policy?', 'How do I enable 2FA?', 'What plans are available?'].map(q => (
                  <button key={q} className="suggestion-chip" onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="avatar">{msg.role === 'user' ? 'U' : 'AI'}</div>
              <div className="msg-content">
                <div className="bubble">
                  {msg.role === 'assistant'
                    ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                    : <p>{msg.content}</p>
                  }
                </div>
                <div className="msg-meta">
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.tokensUsed && <span>{msg.tokensUsed} tokens</span>}
                </div>
              </div>
            </div>
          ))}

          {loading && <TypingIndicator />}
          {error && (
            <div className="error-banner">
              <span>⚠ {error}</span>
              <button onClick={() => setError('')}>✕</button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask a question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className={`send-btn ${loading || !input.trim() ? 'disabled' : ''}`}
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? <span className="spinner" /> : '↑'}
            </button>
          </div>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
