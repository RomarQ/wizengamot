import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './PromptEditorModal.css';

export default function PromptEditorModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialContent = '',
  isNew = false,
  loading = false,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setShowPreview(false);
      // Focus textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialTitle, initialContent]);

  const handleSave = () => {
    if (isNew && !title.trim()) return;
    if (!content.trim()) return;
    onSave(title.trim(), content.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="prompt-editor-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="prompt-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-editor-header">
          <div className="prompt-editor-title-section">
            {isNew ? (
              <input
                type="text"
                className="prompt-editor-title-input"
                placeholder="Enter prompt title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h2 className="prompt-editor-title">{initialTitle || 'Edit Prompt'}</h2>
            )}
          </div>
          <div className="prompt-editor-actions">
            <div className="prompt-editor-toggle">
              <button
                className={`toggle-btn ${!showPreview ? 'active' : ''}`}
                onClick={() => setShowPreview(false)}
              >
                Edit
              </button>
              <button
                className={`toggle-btn ${showPreview ? 'active' : ''}`}
                onClick={() => setShowPreview(true)}
              >
                Preview
              </button>
            </div>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={loading || !content.trim() || (isNew && !title.trim())}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="prompt-editor-body">
          {showPreview ? (
            <div className="prompt-editor-preview markdown-content">
              <ReactMarkdown>{content || '*No content yet*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="prompt-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your system prompt here...

Use Markdown for formatting:
# Heading
## Subheading
- Bullet points
**bold** and *italic*

Press Cmd/Ctrl+S to save, Esc to cancel"
            />
          )}
        </div>

        <div className="prompt-editor-footer">
          <span className="prompt-editor-hint">
            Cmd/Ctrl+S to save | Tab for indent | Esc to cancel
          </span>
          <span className="prompt-editor-stats">
            {content.length} characters | {content.split(/\s+/).filter(Boolean).length} words
          </span>
        </div>
      </div>
    </div>
  );
}
