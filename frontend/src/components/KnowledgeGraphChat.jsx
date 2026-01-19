import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, MessageSquare, RefreshCw, ArrowUpRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import ChatInput from './ChatInput';
import './KnowledgeGraph.css';

/**
 * Renders text content with clickable [Note N] references
 * citations: array of citations for THIS message (primary lookup)
 * fallbackCitations: map of note numbers to citations from other messages (secondary lookup)
 */
function NoteRefRenderer({ content, citations, fallbackCitations, onNoteClick }) {
  // Build citation map: current message's citations take priority, then fallback
  const citationMap = useMemo(() => {
    const map = { ...fallbackCitations };
    // Current message's citations override fallback
    if (citations) {
      citations.forEach((citation, index) => {
        map[index + 1] = citation;
      });
    }
    return map;
  }, [citations, fallbackCitations]);

  // Parse content and replace [Note N] with clickable elements
  const renderWithNoteRefs = useCallback((text) => {
    if (!text) return null;

    const parts = [];
    const regex = /\[Note (\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const noteNum = parseInt(match[1], 10);
      const citation = citationMap[noteNum];

      // Add clickable note reference (clickable if we have a citation, styled but non-functional otherwise)
      parts.push(
        <button
          key={`note-${match.index}`}
          className={`kg-note-ref ${citation ? '' : 'kg-note-ref-unknown'}`}
          onClick={(e) => {
            e.preventDefault();
            if (citation?.note_id && onNoteClick) {
              onNoteClick(citation.note_id);
            }
          }}
          title={citation?.title || `Note ${noteNum}`}
          disabled={!citation}
        >
          [Note {noteNum}]
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  }, [citationMap, onNoteClick]);

  // Custom component to render text nodes with note references
  const TextRenderer = useCallback(({ children }) => {
    if (typeof children === 'string') {
      return <>{renderWithNoteRefs(children)}</>;
    }
    return <>{children}</>;
  }, [renderWithNoteRefs]);

  return (
    <ReactMarkdown
      components={{
        // Override text rendering in paragraphs
        p: ({ children }) => <p><TextRenderer>{children}</TextRenderer></p>,
        li: ({ children }) => <li><TextRenderer>{children}</TextRenderer></li>,
        // Pass through other elements
        text: TextRenderer,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * KnowledgeGraphChat - Chat interface for querying the knowledge graph
 */
export default function KnowledgeGraphChat({
  onClose,
  onSelectConversation,
  onHighlightNode,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Build fallback citation map from all messages
  // This is used as a fallback when a message references notes not in its own citations
  const fallbackCitations = useMemo(() => {
    const map = {};
    messages.forEach((msg) => {
      if (msg.citations) {
        msg.citations.forEach((citation, index) => {
          const noteNum = index + 1;
          // Later citations override earlier ones
          map[noteNum] = citation;
        });
      }
    });
    return map;
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await api.chatWithKnowledgeGraph(userMessage, sessionId);

      // Store session ID for continuity
      if (response.session_id) {
        setSessionId(response.session_id);
      }

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        citations: response.citations || [],
        follow_ups: response.follow_ups || [],
        notes_searched: response.notes_searched || 0
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error.message || 'Unknown error';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error while searching your knowledge graph: ${errorMessage}. Make sure you have indexed some notes using the migration feature.`,
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  // Highlight note in graph (stays in chat)
  const handleCitationClick = (citation) => {
    if (citation.note_id && onHighlightNode) {
      onHighlightNode(citation.note_id);
    }
  };

  // Navigate to full conversation (separate action)
  const handleOpenConversation = (citation, e) => {
    e.stopPropagation();
    if (citation.conversation_id && onSelectConversation) {
      onSelectConversation(citation.conversation_id);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSessionId(null);
    if (sessionId) {
      api.clearKnowledgeGraphChatSession(sessionId).catch(console.error);
    }
  };

  return (
    <div className="kg-chat">
      <div className="kg-chat-header">
        <div className="kg-chat-title">
          <MessageSquare size={18} />
          <span>Knowledge Graph Chat</span>
        </div>
        <div className="kg-chat-actions">
          {messages.length > 0 && (
            <button
              className="kg-btn kg-btn-secondary"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button className="kg-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="kg-chat-messages">
        {messages.length === 0 ? (
          <div className="kg-chat-empty">
            <MessageSquare size={48} strokeWidth={1} />
            <h3>Ask your knowledge graph</h3>
            <p>Ask questions about your notes and I'll find relevant information.</p>
            <div className="kg-chat-suggestions">
              <button onClick={() => handleFollowUp("What are the main topics in my notes?")}>
                What are the main topics in my notes?
              </button>
              <button onClick={() => handleFollowUp("What have I learned about AI?")}>
                What have I learned about AI?
              </button>
              <button onClick={() => handleFollowUp("Summarize my recent learnings")}>
                Summarize my recent learnings
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`kg-chat-message ${msg.role} ${msg.error ? 'error' : ''}`}
            >
              <div className="kg-chat-message-content">
                {msg.role === 'assistant' ? (
                  <NoteRefRenderer
                    content={msg.content}
                    citations={msg.citations}
                    fallbackCitations={fallbackCitations}
                    onNoteClick={onHighlightNode}
                  />
                ) : (
                  msg.content
                )}
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="kg-chat-citations">
                  <div className="kg-chat-citations-title">Sources:</div>
                  {msg.citations.map((citation, i) => (
                    <div key={i} className="kg-chat-citation-row">
                      <button
                        className="kg-chat-citation"
                        onClick={() => handleCitationClick(citation)}
                        title="Show in graph"
                      >
                        <span className="citation-number">Note {i + 1}:</span>
                        <span className="citation-title">{citation.title}</span>
                      </button>
                      {citation.conversation_id && (
                        <button
                          className="kg-citation-open"
                          onClick={(e) => handleOpenConversation(citation, e)}
                          title="Open in conversation"
                        >
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.follow_ups && msg.follow_ups.length > 0 && (
                <div className="kg-chat-followups">
                  <div className="kg-chat-followups-title">Follow-up questions:</div>
                  {msg.follow_ups.map((question, i) => (
                    <button
                      key={i}
                      className="kg-chat-followup"
                      onClick={() => handleFollowUp(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {msg.notes_searched > 0 && (
                <div className="kg-chat-meta">
                  Searched {msg.notes_searched} note{msg.notes_searched !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="kg-chat-message assistant loading">
            <div className="kg-chat-loading">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="kg-chat-input-form">
        <ChatInput
          inputRef={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Ask about your knowledge..."
          disabled={loading}
          loading={loading}
          rows={2}
          minHeight="40px"
          maxHeight="100px"
          hint="Enter to send"
        />
      </div>
    </div>
  );
}
