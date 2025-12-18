import { useState, useEffect } from 'react';
import { api } from '../api';
import './PromptManager.css';

// Catppuccin-based color palette for label badges
const LABEL_COLORS = [
  { bg: 'rgba(30, 102, 245, 0.15)', text: '#1e66f5' },   // blue
  { bg: 'rgba(64, 160, 43, 0.15)', text: '#40a02b' },    // green
  { bg: 'rgba(254, 100, 11, 0.15)', text: '#fe640b' },   // peach
  { bg: 'rgba(136, 57, 239, 0.15)', text: '#8839ef' },   // mauve
  { bg: 'rgba(23, 146, 153, 0.15)', text: '#179299' },   // teal
  { bg: 'rgba(234, 118, 203, 0.15)', text: '#ea76cb' },  // pink
  { bg: 'rgba(223, 142, 29, 0.15)', text: '#df8e1d' },   // yellow
  { bg: 'rgba(4, 165, 229, 0.15)', text: '#04a5e5' },    // sky
];

function getLabelColors(label) {
  if (!label) return LABEL_COLORS[0];
  const hash = label.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LABEL_COLORS[hash % LABEL_COLORS.length];
}

/**
 * Prompt selector component for choosing system prompts.
 */
export default function PromptManager({ onSelect, onClose, onOpenSettings, mode = 'council' }) {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listPrompts(mode);
      setPrompts(data);
      if (data.length > 0 && !selectedPrompt) {
        setSelectedPrompt(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedPrompt) {
      onSelect(selectedPrompt.content);
    }
  };

  const handleSkip = () => {
    onSelect(null);
  };

  if (loading) {
    return (
      <div className="prompt-manager-overlay">
        <div className="prompt-manager">
          <p>Loading prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prompt-manager-overlay" onClick={onClose}>
      <div className="prompt-manager" onClick={(e) => e.stopPropagation()}>
        <div className="prompt-manager-header">
          <h2>Select System Prompt</h2>
          <div className="prompt-manager-header-actions">
            {onOpenSettings && (
              <button onClick={onOpenSettings} className="btn-settings-link">
                Edit in Settings
              </button>
            )}
            <button onClick={onClose} className="btn-close" title="Close (Esc)">
              ×
            </button>
          </div>
        </div>

        <p className="prompt-manager-description">
          Choose a system prompt to guide the council's responses, or skip to use the default behavior.
        </p>

        {error && <div className="error-message">{error}</div>}

        {prompts.length === 0 ? (
          <div className="no-prompts">
            <p>No prompts available yet.</p>
            {onOpenSettings && (
              <button onClick={onOpenSettings} className="btn-primary">
                Create in Settings
              </button>
            )}
          </div>
        ) : (
          <div className="prompt-manager-content">
            <div className="prompt-list">
              {prompts.map((prompt) => {
                const colors = getLabelColors(prompt.short_label);
                return (
                  <div
                    key={prompt.filename}
                    className={`prompt-item ${
                      selectedPrompt?.filename === prompt.filename ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    <div className="prompt-item-title">{prompt.title}</div>
                    {prompt.short_label && (
                      <span
                        className="prompt-label-badge"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {prompt.short_label}
                      </span>
                    )}
                    <div className="prompt-item-preview">
                      {prompt.content.split('\n').slice(1, 3).join(' ').substring(0, 100)}...
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedPrompt && (
              <div className="prompt-preview">
                <h3>Preview: {selectedPrompt.title}</h3>
                <pre className="prompt-content">{selectedPrompt.content}</pre>
              </div>
            )}
          </div>
        )}

        <div className="prompt-manager-actions">
          <button onClick={handleSkip} className="btn-secondary">
            Skip (Use Default)
          </button>
          <button
            onClick={handleSelect}
            className="btn-primary"
            disabled={!selectedPrompt}
          >
            Use This Prompt
          </button>
        </div>
      </div>
    </div>
  );
}
