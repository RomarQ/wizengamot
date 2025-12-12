import { useState } from 'react';
import './StageToolbar.css';

export default function StageToolbar({
  modelName,
  content,
  isInContext,
  onToggleContext,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="stage-toolbar">
      <div className="stage-toolbar-model">{modelName}</div>
      <div className="stage-toolbar-actions">
        <button
          type="button"
          className={`stage-toolbar-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
        <button
          type="button"
          className={`stage-toolbar-btn ${isInContext ? 'active' : ''}`}
          onClick={onToggleContext}
          title={isInContext ? 'Remove from context stack' : 'Add to context stack'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="14" width="16" height="6" rx="1"/>
            <rect x="4" y="4" width="16" height="6" rx="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
