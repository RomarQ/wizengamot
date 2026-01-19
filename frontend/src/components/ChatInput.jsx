import React from 'react';
import { ArrowUp, Loader } from 'lucide-react';
import './ChatInput.css';

/**
 * Unified ChatInput component for consistent input UI across:
 * - Knowledge Graph Discovery
 * - Knowledge Graph Chat
 * - Context Review (CommitSidebar)
 */
export default function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  disabled = false,
  loading = false,
  rows = 2,
  minHeight = '40px',
  maxHeight = '100px',
  hint = null,
  requireModifier = false,
  inputRef = null,
  className = ''
}) {
  const handleKeyDown = (e) => {
    const shouldSubmit = requireModifier
      ? e.key === 'Enter' && (e.metaKey || e.ctrlKey)
      : e.key === 'Enter' && !e.shiftKey;

    if (shouldSubmit) {
      e.preventDefault();
      if (!disabled && value.trim() && !loading) {
        onSubmit();
      }
    }
  };

  const handleClick = () => {
    if (!disabled && value.trim() && !loading) {
      onSubmit();
    }
  };

  return (
    <div className={`chat-input-container ${className}`}>
      <div className="chat-input-wrapper">
        <textarea
          ref={inputRef}
          className="chat-input-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={{ minHeight, maxHeight }}
        />
        <button
          type="button"
          className="chat-input-send-btn"
          onClick={handleClick}
          disabled={disabled || !value.trim() || loading}
          title={requireModifier ? 'Send (⌘/Ctrl+Enter)' : 'Send (Enter)'}
        >
          {loading ? (
            <Loader size={16} className="chat-input-spinner" />
          ) : (
            <ArrowUp size={16} strokeWidth={2.5} />
          )}
        </button>
      </div>
      {hint && <div className="chat-input-hint">{hint}</div>}
    </div>
  );
}
