import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatRelativeTime } from '../utils/formatRelativeTime';

function getSourceTypeLabel(sourceType) {
  const labels = {
    youtube: 'YouTube',
    article: 'Article',
    podcast: 'Podcast',
    pdf: 'PDF',
    arxiv: 'arXiv',
    text: 'Text',
  };
  return labels[sourceType] || sourceType;
}

export default function ConversationGalleryModal({
  item,
  mode,
  promptLabels = {},
  onOpenConversation,
  onClose,
}) {
  const [conversationDetail, setConversationDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch full conversation for preview
  useEffect(() => {
    const loadConversation = async () => {
      setIsLoading(true);
      try {
        const conv = await api.getConversation(item.id);
        setConversationDetail(conv);
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
      setIsLoading(false);
    };

    loadConversation();
  }, [item.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onOpenConversation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onOpenConversation]);

  // Extract preview content based on mode
  const getPreviewContent = () => {
    if (!conversationDetail?.messages) return null;

    if (mode === 'council') {
      // Find the first user message (question)
      const userMessage = conversationDetail.messages.find(m => m.role === 'user');
      // Find the first assistant message with stage3
      const assistantMessage = conversationDetail.messages.find(
        m => m.role === 'assistant' && m.stage3
      );

      return {
        question: userMessage?.content,
        synthesis: assistantMessage?.stage3,
      };
    } else {
      // Synthesizer: find notes
      const assistantMessage = conversationDetail.messages.find(
        m => m.role === 'assistant' && m.notes
      );
      const firstNote = assistantMessage?.notes?.[0];

      return {
        sourceUrl: conversationDetail.synthesizer_config?.source_url,
        noteBody: firstNote?.body,
        noteCount: assistantMessage?.notes?.length || 0,
      };
    }
  };

  const preview = isLoading ? null : getPreviewContent();

  if (isLoading) {
    return (
      <div className="conversation-gallery-modal-overlay" onClick={onClose}>
        <div className="conversation-gallery-modal" onClick={(e) => e.stopPropagation()}>
          <div className="conversation-gallery-modal-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-gallery-modal-overlay" onClick={onClose}>
      <div className="conversation-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="conversation-gallery-modal-header">
          <div className="conversation-gallery-modal-title-section">
            <h3 className="conversation-gallery-modal-title">
              {item.title || (mode === 'council' ? 'New Discussion' : 'New Note')}
            </h3>
            <div className="conversation-gallery-modal-meta">
              <span>{formatRelativeTime(item.created_at)}</span>
              {item.total_cost > 0 && (
                <>
                  <span>|</span>
                  <span>${item.total_cost.toFixed(3)}</span>
                </>
              )}
              {mode === 'synthesizer' && item.source_type && (
                <>
                  <span>|</span>
                  <span>{getSourceTypeLabel(item.source_type)}</span>
                </>
              )}
              {mode === 'council' && item.prompt_title && promptLabels[item.prompt_title] && (
                <>
                  <span>|</span>
                  <span>{promptLabels[item.prompt_title]}</span>
                </>
              )}
            </div>
          </div>
          <button className="conversation-gallery-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="conversation-gallery-modal-content">
          {mode === 'council' ? (
            <>
              {preview?.question && (
                <div className="conversation-gallery-modal-section">
                  <div className="conversation-gallery-modal-section-title">Question</div>
                  <div className="conversation-gallery-modal-section-content">
                    {preview.question}
                  </div>
                </div>
              )}
              {preview?.synthesis && (
                <div className="conversation-gallery-modal-section">
                  <div className="conversation-gallery-modal-section-title">Synthesis</div>
                  <div className="conversation-gallery-modal-section-content">
                    {preview.synthesis}
                  </div>
                </div>
              )}
              {!preview?.question && !preview?.synthesis && (
                <div className="conversation-gallery-modal-section">
                  <div className="conversation-gallery-modal-section-content">
                    No content yet
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {preview?.sourceUrl && (
                <div className="conversation-gallery-modal-section">
                  <div className="conversation-gallery-modal-section-title">Source</div>
                  <div className="conversation-gallery-modal-section-content">
                    <a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {preview.sourceUrl}
                    </a>
                  </div>
                </div>
              )}
              {preview?.noteBody && (
                <div className="conversation-gallery-modal-section">
                  <div className="conversation-gallery-modal-section-title">
                    Note Preview {preview.noteCount > 1 && `(1 of ${preview.noteCount})`}
                  </div>
                  <div className="conversation-gallery-modal-section-content">
                    {preview.noteBody}
                  </div>
                </div>
              )}
              {!preview?.sourceUrl && !preview?.noteBody && (
                <div className="conversation-gallery-modal-section">
                  <div className="conversation-gallery-modal-section-content">
                    No content yet
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="conversation-gallery-modal-footer">
          <button className="conversation-gallery-modal-open-btn" onClick={onOpenConversation}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
