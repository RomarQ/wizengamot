import { useState, useEffect } from 'react';
import ResponseWithComments from './ResponseWithComments';
import { SelectionHandler } from '../utils/SelectionHandler';
import StageToolbar from './StageToolbar';
import './Stage1.css';

export default function Stage1({
  responses,
  messageIndex,
  comments,
  contextSegments = [],
  onSelectionChange,
  onEditComment,
  onDeleteComment,
  activeCommentId,
  onSetActiveComment,
  onAddContextSegment,
  onRemoveContextSegment
}) {
  const [activeTab, setActiveTab] = useState(0);
  const activeResponse = responses?.[activeTab];

  useEffect(() => {
    if (!activeResponse) return;

    const handleMouseUp = () => {
      const selection = SelectionHandler.getSelection();
      if (
        selection &&
        selection.stage === 1 &&
        selection.messageIndex === messageIndex
      ) {
        onSelectionChange({
          ...selection,
          stage: 1,
          model: activeResponse.model,
          messageIndex,
          sourceContent: activeResponse.response,
        });
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [onSelectionChange, activeResponse, messageIndex]);

  // Listen for tab switch events from sidebar
  useEffect(() => {
    const handleSwitchToComment = (e) => {
      if (e.detail.stage === 1 && responses) {
        const tabIndex = responses.findIndex(r => r.model === e.detail.model);
        if (tabIndex !== -1) {
          setActiveTab(tabIndex);
        }
      }
    };
    
    window.addEventListener('switchToComment', handleSwitchToComment);
    return () => window.removeEventListener('switchToComment', handleSwitchToComment);
  }, [responses]);

  if (!responses || responses.length === 0 || !activeResponse) {
    return null;
  }

  const responseComments = comments?.filter(
    c => c.stage === 1 && c.model === activeResponse.model && c.message_index === messageIndex
  ) || [];

  // Check if active comment belongs to this response
  const activeCommentForThisResponse = activeCommentId && responseComments.some(c => c.id === activeCommentId)
    ? activeCommentId
    : null;

  const segmentId = `stage1-${messageIndex}-${activeResponse.model}`;
  const shortModelName = activeResponse.model.split('/')[1] || activeResponse.model;
  const isSegmentSelected = contextSegments.some((segment) => segment.id === segmentId);

  const handleContextToggle = () => {
    if (isSegmentSelected) {
      onRemoveContextSegment?.(segmentId);
    } else {
      onAddContextSegment?.({
        id: segmentId,
        stage: 1,
        model: activeResponse.model,
        messageIndex,
        label: `Stage 1 • ${shortModelName}`,
        content: activeResponse.response,
      });
    }
  };

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

      <div className="tabs">
        {responses.map((resp, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {resp.model.split('/')[1] || resp.model}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <StageToolbar
          modelName={activeResponse.model}
          content={activeResponse.response}
          isInContext={isSegmentSelected}
          onToggleContext={handleContextToggle}
        />
        <ResponseWithComments
          content={activeResponse.response}
          comments={responseComments}
          messageIndex={messageIndex}
          stage={1}
          model={activeResponse.model}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          activeCommentId={activeCommentForThisResponse}
          onSetActiveComment={onSetActiveComment}
          className="response-text"
        />
      </div>
    </div>
  );
}
