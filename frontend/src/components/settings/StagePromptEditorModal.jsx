import { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import '../PromptEditorModal.css';

export default function StagePromptEditorModal({
  isOpen,
  onClose,
  promptType,
  mode = 'council',
}) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && promptType) {
      loadPrompt();
    }
  }, [isOpen, promptType, mode]);

  const loadPrompt = async () => {
    setLoading(true);
    setError('');
    try {
      const data = mode === 'synthesizer'
        ? await api.getSynthStagePrompt(promptType)
        : await api.getStagePrompt(promptType);
      setContent(data.content || '');
      setOriginalContent(data.content || '');
      setIsCustom(!data.is_default);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } catch (err) {
      setError('Failed to load prompt');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    setSaving(true);
    setError('');

    try {
      mode === 'synthesizer'
        ? await api.updateSynthStagePrompt(promptType, content)
        : await api.updateStagePrompt(promptType, content);
      setOriginalContent(content);
      setIsCustom(true);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to the default prompt? Your custom changes will be lost.')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = mode === 'synthesizer'
        ? await api.resetSynthStagePrompt(promptType)
        : await api.resetStagePrompt(promptType);
      setContent(data.content || '');
      setOriginalContent(data.content || '');
      setIsCustom(false);
    } catch (err) {
      setError(err.message || 'Failed to reset prompt');
    } finally {
      setSaving(false);
    }
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
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const getTitle = () => {
    const prefix = mode === 'synthesizer' ? 'Synthesizer ' : '';
    switch (promptType) {
      case 'ranking':
        return `${prefix}Stage 2: Ranking Prompt`;
      case 'chairman':
        return `${prefix}Stage 3: Chairman Prompt`;
      default:
        return 'Stage Prompt';
    }
  };

  const getDescription = () => {
    if (mode === 'synthesizer') {
      switch (promptType) {
        case 'ranking':
          return 'This prompt evaluates Zettelkasten notes from different models. Use {source_content} and {responses_text} as placeholders.';
        case 'chairman':
          return 'This prompt synthesizes the best Zettelkasten notes. Use {source_content}, {stage1_text}, and {stage2_text} as placeholders.';
        default:
          return '';
      }
    }
    switch (promptType) {
      case 'ranking':
        return 'This prompt is used when models evaluate and rank each other\'s responses anonymously. Use {user_query} and {responses_text} as placeholders.';
      case 'chairman':
        return 'This prompt is used by the chairman model to synthesize the final answer. Use {user_query}, {stage1_text}, and {stage2_text} as placeholders.';
      default:
        return '';
    }
  };

  const hasChanges = content !== originalContent;

  if (!isOpen) return null;

  return (
    <div className="prompt-editor-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="prompt-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-editor-header">
          <div className="prompt-editor-title-section">
            <h2 className="prompt-editor-title">
              {getTitle()}
              {isCustom && <span className="custom-badge">Custom</span>}
            </h2>
            <p className="prompt-editor-description">{getDescription()}</p>
          </div>
          <div className="prompt-editor-actions">
            <button
              className="btn-secondary"
              onClick={handleReset}
              disabled={saving || !isCustom}
              title={isCustom ? 'Reset to built-in default' : 'Already using default'}
            >
              Reset
            </button>
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
              disabled={saving || loading || !hasChanges}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="prompt-editor-body">
          {loading ? (
            <div className="prompt-editor-loading">Loading prompt...</div>
          ) : error ? (
            <div className="prompt-editor-error">{error}</div>
          ) : showPreview ? (
            <div className="prompt-editor-preview">
              <pre className="prompt-preview-content">{content || 'No content yet'}</pre>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="prompt-editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your stage prompt here..."
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
