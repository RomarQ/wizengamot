import { useState, useMemo } from 'react';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import './ConversationGallery.css';

// Mode icons
const MODE_ICONS = {
  council: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
      <circle cx="4" cy="9" r="2.5" />
      <path d="M1 19a4 4 0 0 1 6 0" />
      <circle cx="20" cy="9" r="2.5" />
      <path d="M17 19a4 4 0 0 1 6 0" />
    </svg>
  ),
  synthesizer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="9" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
};

function getSourceTypeLabel(sourceType) {
  const labels = {
    youtube: 'YouTube',
    article: 'Article',
    podcast: 'Podcast',
    pdf: 'PDF',
    arxiv: 'arXiv'
  };
  return labels[sourceType] || sourceType;
}

function getSourceTypeBadgeClass(sourceType) {
  return `conversation-gallery-badge source-${sourceType}`;
}

// Date grouping helper
function groupByDate(items) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  items.forEach(item => {
    const date = new Date(item.created_at);
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let groupKey;

    if (itemDate >= today) {
      groupKey = 'Today';
    } else if (itemDate >= thisWeekStart) {
      groupKey = 'This Week';
    } else if (itemDate >= lastWeekStart) {
      groupKey = 'Last Week';
    } else {
      // Group by month: "December 2024"
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      groupKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  });

  // Sort groups in chronological order (most recent first)
  const orderedKeys = ['Today', 'This Week', 'Last Week'];
  const monthGroups = Object.keys(groups)
    .filter(k => !orderedKeys.includes(k))
    .sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return monthNames.indexOf(monthB) - monthNames.indexOf(monthA);
    });

  const sortedGroups = {};
  [...orderedKeys, ...monthGroups].forEach(key => {
    if (groups[key]) sortedGroups[key] = groups[key];
  });

  return sortedGroups;
}

export default function ConversationGallery({
  mode,
  items,
  onSelectConversation,
  onClose,
  onNewItem,
  promptLabels = {},
}) {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');

  const galleryTitle = mode === 'council' ? 'Council' : 'Notes';
  const itemLabel = mode === 'council' ? 'discussions' : 'notes';

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items];
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'title':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'cost':
        sorted.sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [items, sortBy]);

  // Group items by date
  const groupedItems = useMemo(() => groupByDate(sortedItems), [sortedItems]);

  const handleCardClick = (item) => {
    onSelectConversation(item.id);
  };

  const renderCard = (item) => {
    const isCouncil = mode === 'council';
    const hasBadges = (!isCouncil && item.source_type) ||
                      (!isCouncil && item.is_deliberation) ||
                      (item.thread_count > 0) ||
                      (isCouncil && item.prompt_title && promptLabels[item.prompt_title]);

    return (
      <div
        key={item.id}
        className={`conversation-gallery-card ${mode}`}
        onClick={() => handleCardClick(item)}
      >
        <div className="conversation-gallery-card-content">
          <div className="conversation-gallery-card-title">
            {item.title || (isCouncil ? 'New Conversation' : 'New Note')}
          </div>

          {hasBadges && (
            <div className="conversation-gallery-badges">
              {!isCouncil && item.source_type && (
                <span className={getSourceTypeBadgeClass(item.source_type)}>
                  {getSourceTypeLabel(item.source_type)}
                </span>
              )}
              {!isCouncil && item.is_deliberation && (
                <span className="conversation-gallery-badge deliberation">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
                    <circle cx="4" cy="9" r="2.5" />
                    <path d="M1 19a4 4 0 0 1 6 0" />
                    <circle cx="20" cy="9" r="2.5" />
                    <path d="M17 19a4 4 0 0 1 6 0" />
                  </svg>
                  Council
                </span>
              )}
              {item.thread_count > 0 && (
                <span className="conversation-gallery-badge threads">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {item.thread_count}
                </span>
              )}
              {isCouncil && item.prompt_title && promptLabels[item.prompt_title] && (
                <span className="conversation-gallery-badge">
                  {promptLabels[item.prompt_title]}
                </span>
              )}
            </div>
          )}

          {item.summary && (
            <div className="conversation-gallery-card-summary">
              {item.summary}
            </div>
          )}

          <div className="conversation-gallery-card-meta">
            <span>{formatRelativeTime(item.created_at)}</span>
            {item.total_cost > 0 && (
              <>
                <span className="conversation-gallery-card-meta-separator">|</span>
                <span>${item.total_cost.toFixed(3)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="conversation-gallery">
      <header className="conversation-gallery-header">
        <button className="conversation-gallery-back-btn" onClick={onClose} title="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2>{galleryTitle}</h2>
        <span className="conversation-gallery-count">{items.length} {itemLabel}</span>
        <div className="conversation-gallery-view-options">
          <button
            className={`conversation-gallery-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            className={`conversation-gallery-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <select
            className="conversation-gallery-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="cost">Cost</option>
          </select>
        </div>
      </header>

      <div className="conversation-gallery-content">
        {Object.entries(groupedItems).map(([groupName, groupItems]) => (
          <div key={groupName} className="conversation-gallery-date-group">
            <div className="conversation-gallery-date-header">{groupName}</div>
            <div className="conversation-gallery-grid">
              {groupItems.map(item => renderCard(item))}
            </div>
          </div>
        ))}

        {/* Add new button - in its own section */}
        <div className="conversation-gallery-date-group">
          <div className="conversation-gallery-grid">
            <div
              className={`conversation-gallery-card conversation-gallery-card-add ${mode}`}
              onClick={onNewItem}
            >
              <div className="conversation-gallery-add-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
