import './ApiKeyWarning.css';

const WARNING_CONFIGS = {
  openrouter: {
    title: 'OpenRouter API key not configured',
    description: 'Required for AI model queries in Council, Synthesizer, and Visualiser modes.',
    link: 'https://openrouter.ai/keys',
    linkText: 'Get a key at openrouter.ai',
  },
  firecrawl: {
    title: 'Firecrawl API key not configured',
    description: 'Required for web scraping in Synthesizer and Monitor modes.',
    link: 'https://www.firecrawl.dev/',
    linkText: 'Get a key at firecrawl.dev',
  },
};

export default function ApiKeyWarning({ keyType, onOpenSettings, onDismiss }) {
  const config = WARNING_CONFIGS[keyType];

  if (!config) return null;

  return (
    <div className="api-key-warning">
      <div className="api-key-warning-content">
        <div className="api-key-warning-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="api-key-warning-text">
          <strong>{config.title}</strong>
          <span>{config.description}</span>
          <a href={config.link} target="_blank" rel="noopener noreferrer" className="api-key-warning-link">
            {config.linkText}
          </a>
        </div>
        <div className="api-key-warning-actions">
          <button className="api-key-warning-settings-btn" onClick={onOpenSettings}>
            Open Settings
          </button>
          <button className="api-key-warning-dismiss-btn" onClick={onDismiss} title="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
