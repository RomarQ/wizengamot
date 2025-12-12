import './CouncilDiscussionView.css';

export default function CouncilViewToggle({
  viewMode,
  onViewChange,
  stageCount = 3,
  conversationCount = 0,
}) {
  return (
    <div className="council-view-toggle">
      <button
        className={`council-toggle-btn ${viewMode === 'stages' ? 'active' : ''}`}
        onClick={() => onViewChange('stages')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Stages ({stageCount})
      </button>
      <button
        className={`council-toggle-btn ${viewMode === 'conversation' ? 'active' : ''}`}
        onClick={() => onViewChange('conversation')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Conversation {conversationCount > 0 && `(${conversationCount})`}
      </button>
    </div>
  );
}
