import './CouncilDiscussionView.css';

export default function StageTabs({
  activeStage,
  onStageChange,
  stage1ModelCount = 0,
  hasStage2 = true,
  hasStage3 = true,
}) {
  return (
    <div className="stage-tabs">
      <button
        className={`stage-tab ${activeStage === 1 ? 'active' : ''}`}
        onClick={() => onStageChange(1)}
      >
        Stage 1: Responses {stage1ModelCount > 0 && `(${stage1ModelCount})`}
      </button>
      {hasStage2 && (
        <button
          className={`stage-tab ${activeStage === 2 ? 'active' : ''}`}
          onClick={() => onStageChange(2)}
        >
          Stage 2: Rankings
        </button>
      )}
      {hasStage3 && (
        <button
          className={`stage-tab ${activeStage === 3 ? 'active' : ''}`}
          onClick={() => onStageChange(3)}
        >
          Stage 3: Synthesis
        </button>
      )}
    </div>
  );
}
