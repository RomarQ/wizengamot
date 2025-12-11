import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './ThreadView.css';

/**
 * Component for displaying and continuing a follow-up thread with a specific model
 */
function ThreadView({ thread, onContinue, onClose }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!thread) return null;

  const commentCount = thread.context?.comment_ids?.length || 0;
  const contextSegments = thread.context?.context_segments || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    await onContinue(question.trim());
    setQuestion('');
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="thread-view">
      <div className="thread-header">
        <div className="thread-title">
          <h3>Follow-up with {thread.model}</h3>
          <p className="thread-context-info">
            {commentCount} annotation{commentCount !== 1 ? 's' : ''}{contextSegments.length > 0 ? ` · ${contextSegments.length} segment${contextSegments.length !== 1 ? 's' : ''}` : ''} in context
          </p>
        </div>
        <button className="thread-close" onClick={onClose} title="Close thread">
          &times;
        </button>
      </div>

      {(contextSegments.length > 0) && (
        <div className="thread-context-summary">
          <div className="thread-context-stack-title">Context Stack</div>
          <div className="thread-context-stack-list">
            {contextSegments.map((segment, idx) => (
              <div key={segment.id || idx} className="thread-context-card">
                <div className="thread-context-card-header">
                  <span className="thread-context-label">Stage {segment.stage} · {segment.model}</span>
                  {segment.label && <span className="thread-context-pill">{segment.label}</span>}
                </div>
                <div className="thread-context-snippet">
                  {segment.content.length > 200
                    ? `${segment.content.substring(0, 200)}...`
                    : segment.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="thread-messages">
        {thread.messages.map((msg, index) => (
          <div key={index} className={`thread-message thread-message-${msg.role}`}>
            <div className="thread-message-role">
              {msg.role === 'user' ? 'You' : thread.model}
            </div>
            <div className="thread-message-content markdown-content">
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
            </div>
            <div className="thread-message-time">
              {new Date(msg.created_at).toLocaleString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="thread-message thread-message-assistant">
            <div className="thread-message-role">{thread.model}</div>
            <div className="thread-message-content">
              <div className="thread-loading">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <form className="thread-input-form" onSubmit={handleSubmit}>
        <textarea
          className="thread-input"
          placeholder="Continue the conversation..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={2}
        />
        <button
          type="submit"
          className="thread-submit"
          disabled={!question.trim() || isLoading}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ThreadView;
