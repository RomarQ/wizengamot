import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './CouncilDiscussionView.css';

export default function CouncilConversationView({ messages, getModelShortName }) {
  const threadEndRef = useRef(null);

  // Filter for follow-up messages only
  const followUpMessages = messages.filter(
    (msg) => msg.role === 'follow-up-user' || msg.role === 'follow-up-assistant'
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [followUpMessages.length]);

  if (followUpMessages.length === 0) {
    return (
      <div className="council-conversation-view">
        <div className="council-conversation-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h3>No follow-up conversations yet</h3>
          <p>
            Highlight text in any stage response and add a comment to start a follow-up
            conversation with a specific model.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="council-conversation-view">
      <div className="council-conversation-thread">
        {followUpMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`council-message ${msg.role === 'follow-up-user' ? 'user' : 'assistant'}`}
          >
            <div className="council-message-header">
              {msg.role === 'follow-up-user' ? (
                <>
                  You
                  {msg.model && (
                    <span className="council-context-badge">
                      → {getModelShortName(msg.model)}
                    </span>
                  )}
                </>
              ) : (
                getModelShortName(msg.model)
              )}
            </div>

            {/* Show context badges for user messages with context */}
            {msg.role === 'follow-up-user' && (msg.comments?.length > 0 || msg.context_segments?.length > 0) && (
              <div className="council-context-badges">
                {msg.comments?.map((comment, cidx) => (
                  <span key={comment.id || cidx} className="council-context-badge">
                    Stage {comment.stage} • {getModelShortName(comment.model)}
                  </span>
                ))}
                {msg.context_segments?.map((segment, sidx) => (
                  <span key={segment.id || sidx} className="council-context-badge">
                    {segment.label || `Stage ${segment.stage}`}
                  </span>
                ))}
              </div>
            )}

            <div className="council-message-content">
              {msg.loading ? (
                <div className="council-message-loading">
                  <div className="spinner"></div>
                  <span>Thinking...</span>
                </div>
              ) : (
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={threadEndRef} />
      </div>
    </div>
  );
}
