import './CouncilDiscussionView.css';

export default function CouncilMiniNav({
  viewMode,
  activeStage,
  models = [],
  activeModel,
  onModelChange,
}) {
  const getModelShortName = (model) => {
    if (!model) return '';
    const parts = model.split('/');
    return parts[parts.length - 1] || model;
  };

  // Hide mini-nav when:
  // - In conversation view
  // - Stage 3 (single synthesis, no tabs)
  // - Only 1 or no models
  const shouldShow = viewMode === 'stages' && models.length > 1;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="council-mini-nav">
      <div className="mini-nav-indicator">
        {activeStage === 1 ? 'Responses' : 'Rankings'}
      </div>

      <div className="mini-nav-buttons expert-buttons">
        {models.map((model) => (
          <button
            key={model}
            className={`mini-nav-btn expert ${activeModel === model ? 'active' : ''}`}
            onClick={() => onModelChange(model)}
            title={model}
          >
            {getModelShortName(model)}
          </button>
        ))}
      </div>
    </div>
  );
}
