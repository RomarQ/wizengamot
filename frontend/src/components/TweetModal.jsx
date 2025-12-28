import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import './TweetModal.css';

/**
 * Modal for sharing notes to Twitter/X.
 * Shows the note content (auto-copied) and source URL for threading.
 */
function TweetModal({
  note,
  sourceUrl,
  conversationId,
  onClose,
  onTweetSaved,
}) {
  const [noteCopied, setNoteCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [generatedTweet, setGeneratedTweet] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

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

  // Check for existing tweet or generate new one on mount
  useEffect(() => {
    const initTweet = async () => {
      if (!note?.body || !note?.title) return;

      // If tweet already exists, use it
      if (note.tweet) {
        setGeneratedTweet(note.tweet);
        setTimeout(() => {
          copyToClipboard(note.tweet, setNoteCopied);
        }, 100);
        return;
      }

      // Generate new tweet
      setIsGenerating(true);
      setError(null);

      try {
        const result = await api.generateTweet(note.body, note.title);
        if (result?.tweet) {
          setGeneratedTweet(result.tweet);
          // Save to backend
          if (conversationId && note.id) {
            try {
              await api.saveNoteTweet(conversationId, note.id, result.tweet);
              onTweetSaved?.(note.id, result.tweet);
            } catch (saveErr) {
              console.error('Failed to save tweet:', saveErr);
            }
          }
          // Auto-copy the generated tweet
          setTimeout(() => {
            copyToClipboard(result.tweet, setNoteCopied);
          }, 100);
        } else {
          setError('Failed to generate tweet');
        }
      } catch (err) {
        console.error('Tweet generation error:', err);
        setError('Failed to generate tweet');
      } finally {
        setIsGenerating(false);
      }
    };

    initTweet();
  }, [note?.body, note?.title, note?.tweet, note?.id, conversationId, copyToClipboard, onTweetSaved]);

  // Regenerate function
  const handleRegenerate = useCallback(async () => {
    if (!note?.body || !note?.title) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await api.generateTweet(note.body, note.title);
      if (result?.tweet) {
        setGeneratedTweet(result.tweet);
        // Save to backend
        if (conversationId && note.id) {
          try {
            await api.saveNoteTweet(conversationId, note.id, result.tweet);
            onTweetSaved?.(note.id, result.tweet);
          } catch (saveErr) {
            console.error('Failed to save tweet:', saveErr);
          }
        }
        copyToClipboard(result.tweet, setNoteCopied);
      } else {
        setError('Failed to generate tweet');
      }
    } catch (err) {
      console.error('Tweet generation error:', err);
      setError('Failed to generate tweet');
    } finally {
      setIsGenerating(false);
    }
  }, [note?.body, note?.title, note?.id, conversationId, copyToClipboard, onTweetSaved]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const displayText = generatedTweet || '';
  const charCount = displayText.length;
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
            {isGenerating ? (
              <div className="tweet-loading">Generating tweet...</div>
            ) : error ? (
              <div className="tweet-error">{error}</div>
            ) : (
              <div className="tweet-text">{displayText}</div>
            )}
            {!isGenerating && !error && (
              <div className={`tweet-char-count ${isOverLimit ? 'over-limit' : ''}`}>
                {charCount}/280
              </div>
            )}
          </div>

          {noteCopied && (
            <div className="tweet-copied-badge">Tweet copied to clipboard!</div>
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
            className="btn-secondary"
            onClick={handleRegenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(displayText, setNoteCopied)}
            disabled={isGenerating || !displayText}
          >
            Copy Tweet
          </button>
        </div>
      </div>
    </div>
  );
}

export default TweetModal;
