import React, { useState, useEffect, useCallback } from 'react';
import './TweetModal.css';

/**
 * Modal for sharing notes to Twitter/X.
 * Shows the note content (auto-copied) and source URL for threading.
 */
function TweetModal({
  note,
  sourceUrl,
  onClose,
}) {
  const [noteCopied, setNoteCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Copy function
  const copyToClipboard = useCallback(async (text, setCopied) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback: try using execCommand
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr);
      }
    }
  }, []);

  // Auto-copy note on mount
  useEffect(() => {
    if (note?.body) {
      const timer = setTimeout(() => {
        copyToClipboard(note.body, setNoteCopied);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [note?.body, copyToClipboard]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const charCount = note?.body?.length || 0;
  const isOverLimit = charCount > 280;

  return (
    <div className="tweet-modal-overlay" onClick={onClose}>
      <div
        className="tweet-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="tweet-modal-header">
          <h3>Share to X</h3>
          <button className="tweet-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="tweet-modal-body">
          <div className="tweet-content-box">
            <div className="tweet-text">{note?.body}</div>
            <div className={`tweet-char-count ${isOverLimit ? 'over-limit' : ''}`}>
              {charCount}/280
            </div>
          </div>

          {noteCopied && (
            <div className="tweet-copied-badge">Note copied to clipboard!</div>
          )}

          {sourceUrl && (
            <div className="tweet-source-section">
              <div className="tweet-source-label">Source URL (for thread):</div>
              <div className="tweet-source-row">
                <code className="tweet-source-url">{sourceUrl}</code>
                <button
                  className="tweet-copy-url-btn"
                  onClick={() => copyToClipboard(sourceUrl, setUrlCopied)}
                >
                  {urlCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="tweet-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(note?.body, setNoteCopied)}
          >
            Copy Note Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default TweetModal;
