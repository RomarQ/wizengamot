import { useEffect } from 'react';
import ResponseWithComments from './ResponseWithComments';
import { SelectionHandler } from '../utils/SelectionHandler';
import AddToContextButton from './AddToContextButton';
import './Stage3.css';

export default function Stage3({
  finalResponse,
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
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = SelectionHandler.getSelection();
      if (selection && selection.stage === 3) {
        onSelectionChange(selection);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [onSelectionChange]);

  if (!finalResponse) {
    return null;
  }

  const stage3Comments = comments?.filter(
    c => c.stage === 3 && c.model === finalResponse.model && c.message_index === messageIndex
  ) || [];

  // Check if active comment belongs to this response
  const activeCommentForThisResponse = activeCommentId && stage3Comments.some(c => c.id === activeCommentId)
    ? activeCommentId
    : null;

  const segmentId = `stage3-${messageIndex}-${finalResponse.model}`;
  const shortModelName = finalResponse.model.split('/')[1] || finalResponse.model;
  const isSegmentSelected = contextSegments.some((segment) => segment.id === segmentId);

  const handleContextToggle = () => {
    if (isSegmentSelected) {
      onRemoveContextSegment?.(segmentId);
    } else {
      onAddContextSegment?.({
        id: segmentId,
        stage: 3,
        model: finalResponse.model,
        messageIndex,
        label: `Stage 3 • ${shortModelName}`,
        content: finalResponse.response,
      });
    }
  };

  return (
    <div className="stage stage3">
      <h3 className="stage-title">Stage 3: Final Council Answer</h3>
      <div className="final-response">
        <div className="stage-toolbar">
          <div className="chairman-label">
            Chairman: {shortModelName}
          </div>
          <AddToContextButton
            isSelected={isSegmentSelected}
            onToggle={handleContextToggle}
            label="Stack Final Answer"
          />
        </div>
        <ResponseWithComments
          content={finalResponse.response}
          comments={stage3Comments}
          messageIndex={messageIndex}
          stage={3}
          model={finalResponse.model}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          activeCommentId={activeCommentForThisResponse}
          onSetActiveComment={onSetActiveComment}
          className="final-text"
        />
      </div>
    </div>
  );
}
