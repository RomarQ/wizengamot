import './CouncilDiscussionView.css';

export default function CouncilConfigBar({ councilModels = [], chairmanModel }) {
  const getModelShortName = (model) => {
    return model?.split('/')[1] || model;
  };

  if (!councilModels.length && !chairmanModel) {
    return null;
  }

  return (
    <div className="council-config-bar">
      <div className="config-info">
        <span className="config-label">Council:</span>
        <span className="config-value">
          {councilModels.map(getModelShortName).join(', ')}
        </span>
      </div>
      <div className="config-info">
        <span className="config-label">Chairman:</span>
        <span className="config-value">
          {getModelShortName(chairmanModel)}
        </span>
      </div>
    </div>
  );
}
