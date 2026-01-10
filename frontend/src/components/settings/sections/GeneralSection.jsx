import { useState, useEffect } from 'react';
import { api } from '../../../api';
import ModelReplacementModal from '../ModelReplacementModal';
import './GeneralSection.css';

export default function GeneralSection({
  settings,
  modelSettings,
  crawlerSettings,
  loading,
  setLoading,
  setError,
  setSuccess,
  onReload,
}) {
  const [apiKey, setApiKey] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [newModel, setNewModel] = useState('');

  // Crawler settings state
  const [crawlerHealth, setCrawlerHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [crawl4aiUrl, setCrawl4aiUrl] = useState('');
  const [urlSaving, setUrlSaving] = useState(false);
  const [testingModel, setTestingModel] = useState(null);
  const [testResults, setTestResults] = useState({}); // model -> 'passed' | 'failed'
  const [testErrorPopup, setTestErrorPopup] = useState(null); // { model, message }
  const [replacementModal, setReplacementModal] = useState({
    isOpen: false,
    modelToRemove: null,
    dependencies: null,
  });

  // Initialize crawl4ai URL from settings
  useEffect(() => {
    if (crawlerSettings?.crawl4ai_url) {
      setCrawl4aiUrl(crawlerSettings.crawl4ai_url);
    }
  }, [crawlerSettings]);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      setHealthLoading(true);
      try {
        const health = await api.getCrawlerHealth();
        setCrawlerHealth(health);
      } catch {
        setCrawlerHealth({ healthy: false, error: 'Connection failed' });
      }
      setHealthLoading(false);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Format uptime for display
  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Crawler settings handlers
  const handleUpdateCrawlerProvider = async (provider) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateCrawlerSettings({ provider });
      setSuccess(`Switched to ${provider === 'crawl4ai' ? 'Crawl4AI' : 'Firecrawl'}`);
      await onReload();
    } catch (err) {
      setError('Failed to update crawler provider');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoFallback = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateCrawlerSettings({ auto_fallback: !crawlerSettings?.auto_fallback });
      setSuccess(crawlerSettings?.auto_fallback ? 'Auto-fallback disabled' : 'Auto-fallback enabled');
      await onReload();
    } catch (err) {
      setError('Failed to update fallback setting');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCrawl4aiUrl = async () => {
    if (!crawl4aiUrl.trim()) {
      setError('Please enter a Crawl4AI URL');
      return;
    }

    setUrlSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateCrawlerSettings({ crawl4ai_url: crawl4aiUrl.trim() });
      setSuccess('Crawl4AI URL saved');
      await onReload();
    } catch (err) {
      setError('Failed to save Crawl4AI URL');
    } finally {
      setUrlSaving(false);
    }
  };

  // API Key handlers
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateApiKey(apiKey.trim());
      setSuccess('API key saved successfully');
      setApiKey('');
      await onReload();
    } catch (err) {
      setError('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClearApiKey = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.clearApiKey();
      setSuccess('API key cleared (using environment variable if set)');
      await onReload();
    } catch (err) {
      setError('Failed to clear API key');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFirecrawlKey = async () => {
    if (!firecrawlKey.trim()) {
      setError('Please enter a Firecrawl API key');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateFirecrawlApiKey(firecrawlKey.trim());
      setSuccess('Firecrawl API key saved successfully');
      setFirecrawlKey('');
      await onReload();
    } catch (err) {
      setError('Failed to save Firecrawl API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFirecrawlKey = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.clearFirecrawlApiKey();
      setSuccess('Firecrawl API key cleared');
      await onReload();
    } catch (err) {
      setError('Failed to clear Firecrawl API key');
    } finally {
      setLoading(false);
    }
  };

  // Model Pool handlers
  const handleTestModel = async (model) => {
    setTestingModel(model);
    setTestErrorPopup(null);

    try {
      const result = await api.testModel(model);
      if (result.success) {
        setTestResults((prev) => ({ ...prev, [model]: 'passed' }));
      } else {
        setTestResults((prev) => ({ ...prev, [model]: 'failed' }));
        setTestErrorPopup({ model, message: result.error || 'Unknown error' });
      }
    } catch (err) {
      const message = typeof err === 'string' ? err : (err?.message || 'Unknown error');
      setTestResults((prev) => ({ ...prev, [model]: 'failed' }));
      setTestErrorPopup({ model, message });
    } finally {
      setTestingModel(null);
    }
  };

  const handleAddModel = async () => {
    if (!newModel.trim()) return;

    const modelId = newModel.trim();
    if (modelSettings.model_pool.includes(modelId)) {
      setError('Model already in pool');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First test the model
      const testResult = await api.testModel(modelId);
      if (!testResult.success) {
        setError(`Cannot add model: ${testResult.error || 'Model test failed'}`);
        setLoading(false);
        return;
      }

      // Model works, add it
      const newPool = [...modelSettings.model_pool, modelId];
      await api.updateModelPool(newPool);
      setSuccess('Model added successfully');
      setNewModel('');
      await onReload();
    } catch (err) {
      const message = typeof err === 'string' ? err : (err?.message || 'Unknown error');
      setError(`Failed to add model: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveModel = async (model) => {
    if (modelSettings.model_pool.length <= 1) {
      setError('Cannot remove the last model');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check dependencies first
      const deps = await api.getModelDependencies(model);

      if (deps.replacement_required && deps.replacement_required.length > 0) {
        // Model is in use, show replacement modal
        setReplacementModal({
          isOpen: true,
          modelToRemove: model,
          dependencies: deps,
        });
        setLoading(false);
        return;
      }

      // No dependencies, safe to remove
      const newPool = modelSettings.model_pool.filter((m) => m !== model);
      await api.updateModelPool(newPool);
      setSuccess('Model removed successfully');
      await onReload();
    } catch (err) {
      setError('Failed to remove model');
    } finally {
      setLoading(false);
    }
  };

  const handleReplacementSuccess = async () => {
    setSuccess('Model replaced and removed successfully');
    setReplacementModal({ isOpen: false, modelToRemove: null, dependencies: null });
    await onReload();
  };

  const getModelShortName = (model) => model.split('/')[1] || model;

  return (
    <div className="settings-section general-section">
      {/* API Keys */}
      <div id="api-keys" className="modal-section">
        <h3>API Keys</h3>

        <div className="api-key-block">
          <div className="api-key-header">
            <strong>OpenRouter</strong>
            <span className="api-key-hint">
              Required for LLM queries. Get your key at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                openrouter.ai/keys
              </a>
            </span>
          </div>
          {settings && (
            <div className="api-key-status">
              <span className={`status-indicator ${settings.api_key_configured ? 'configured' : 'not-configured'}`}>
                {settings.api_key_configured ? 'Configured' : 'Not Configured'}
              </span>
              {settings.api_key_configured && (
                <span className="status-source">
                  (via {settings.api_key_source === 'settings' ? 'saved settings' : 'environment variable'})
                </span>
              )}
            </div>
          )}
          <div className="api-key-input-group">
            <input
              type="password"
              className="api-key-input"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <button className="btn-primary" onClick={handleSaveApiKey} disabled={loading || !apiKey.trim()}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
          {settings?.api_key_source === 'settings' && (
            <button className="btn-secondary btn-clear" onClick={handleClearApiKey} disabled={loading}>
              Clear Saved Key
            </button>
          )}
        </div>

        <div className="api-key-block">
          <div className="api-key-header">
            <strong>Firecrawl</strong>
            <span className="api-key-hint">
              Required for scraping articles. Get your key at{' '}
              <a href="https://www.firecrawl.dev/" target="_blank" rel="noopener noreferrer">
                firecrawl.dev
              </a>
            </span>
          </div>
          {settings && (
            <div className="api-key-status">
              <span className={`status-indicator ${settings.firecrawl_configured ? 'configured' : 'not-configured'}`}>
                {settings.firecrawl_configured ? 'Configured' : 'Not Configured'}
              </span>
              {settings.firecrawl_configured && settings.firecrawl_source && (
                <span className="status-source">
                  (via {settings.firecrawl_source === 'settings' ? 'saved settings' : 'environment variable'})
                </span>
              )}
            </div>
          )}
          <div className="api-key-input-group">
            <input
              type="password"
              className="api-key-input"
              placeholder="fc-..."
              value={firecrawlKey}
              onChange={(e) => setFirecrawlKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFirecrawlKey()}
            />
            <button className="btn-primary" onClick={handleSaveFirecrawlKey} disabled={loading || !firecrawlKey.trim()}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
          {settings?.firecrawl_source === 'settings' && (
            <button className="btn-secondary btn-clear" onClick={handleClearFirecrawlKey} disabled={loading}>
              Clear Saved Key
            </button>
          )}
        </div>
      </div>

      {/* Model Pool */}
      <div id="model-pool" className="modal-section">
        <h3>Model Pool</h3>
        <p className="section-description">
          Available models for all modes. Models are tested before being added.
        </p>

        <div className="model-pool-list">
          {modelSettings?.model_pool.map((model) => {
            const testStatus = testResults[model];
            const isTesting = testingModel === model;

            return (
              <div key={model} className="model-pool-item">
                <button
                  className={`btn-test-model ${isTesting ? 'testing' : ''} ${testStatus === 'passed' ? 'passed' : ''} ${testStatus === 'failed' ? 'failed' : ''}`}
                  onClick={() => handleTestModel(model)}
                  disabled={loading || isTesting}
                  title={testStatus === 'passed' ? 'Test passed - click to retest' : testStatus === 'failed' ? 'Test failed - click to retry' : 'Click to test model'}
                >
                  {isTesting ? (
                    <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                  ) : testStatus === 'passed' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : testStatus === 'failed' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                </button>
                <span className="model-name">{model}</span>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveModel(model)}
                  disabled={loading || modelSettings.model_pool.length <= 1}
                  title="Remove model"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Error Popup */}
        {testErrorPopup && (
          <div className="test-error-popup">
            <div className="test-error-content">
              <span className="test-error-icon">✕</span>
              <div className="test-error-text">
                <strong>{testErrorPopup.model.split('/')[1]}</strong>
                <span>{testErrorPopup.message}</span>
              </div>
              <button className="test-error-close" onClick={() => setTestErrorPopup(null)}>×</button>
            </div>
          </div>
        )}

        <div className="add-model-group">
          <input
            type="text"
            className="add-model-input"
            placeholder="e.g., openai/gpt-4"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
          />
          <button className="btn-primary btn-small" onClick={handleAddModel} disabled={loading || !newModel.trim()}>
            Add
          </button>
        </div>
      </div>

      {/* Web Scraping */}
      <div id="web-scraping" className="modal-section">
        <h3>Web Scraping</h3>

        {/* Crawl4AI Health Card */}
        <div className="crawler-health-card">
          <div className="crawler-health-header">
            <span className="crawler-service-name">Crawl4AI Service</span>
            <div className="health-status">
              <span className={`health-dot ${healthLoading ? 'loading' : crawlerHealth?.healthy ? 'healthy' : 'unhealthy'}`}></span>
              <span className="health-label">
                {healthLoading ? 'Checking...' : crawlerHealth?.healthy ? 'Healthy' : crawlerHealth?.error || 'Unavailable'}
              </span>
            </div>
          </div>

          {crawlerHealth?.healthy && (
            <div className="health-stats">
              <div className="health-stat">
                <span className="stat-label">Memory</span>
                <span className="stat-value">{crawlerHealth.memory_percent?.toFixed(1) || 'N/A'}%</span>
              </div>
              <div className="health-stat">
                <span className="stat-label">CPU</span>
                <span className="stat-value">{crawlerHealth.cpu_percent?.toFixed(1) || 'N/A'}%</span>
              </div>
              <div className="health-stat">
                <span className="stat-label">Uptime</span>
                <span className="stat-value">{formatUptime(crawlerHealth.uptime_seconds)}</span>
              </div>
            </div>
          )}

          <div className="crawler-url-display">
            {crawlerSettings?.crawl4ai_url || 'http://localhost:11235'}
          </div>
        </div>

        {/* Provider Selection */}
        <div className="crawler-setting-row">
          <label htmlFor="crawler-provider">Provider</label>
          <select
            id="crawler-provider"
            className="crawler-select"
            value={crawlerSettings?.provider || 'crawl4ai'}
            onChange={(e) => handleUpdateCrawlerProvider(e.target.value)}
            disabled={loading}
          >
            <option value="crawl4ai">Crawl4AI (recommended)</option>
            <option value="firecrawl">Firecrawl</option>
          </select>
        </div>

        {/* Auto-fallback */}
        <div className="crawler-setting-row crawler-checkbox-row">
          <label className="crawler-checkbox-label">
            <input
              type="checkbox"
              checked={crawlerSettings?.auto_fallback || false}
              onChange={handleToggleAutoFallback}
              disabled={loading}
            />
            <span>Auto-fallback to Firecrawl if Crawl4AI unavailable</span>
          </label>
          {settings?.firecrawl_configured && (
            <span className="firecrawl-status configured">Firecrawl configured</span>
          )}
          {!settings?.firecrawl_configured && (
            <span className="firecrawl-status not-configured">Firecrawl not configured</span>
          )}
        </div>

        {/* Crawl4AI URL */}
        <div className="crawler-setting-row">
          <label htmlFor="crawl4ai-url">Crawl4AI URL</label>
          <div className="crawler-url-input-group">
            <input
              id="crawl4ai-url"
              type="text"
              className="crawler-url-input"
              placeholder="http://localhost:11235"
              value={crawl4aiUrl}
              onChange={(e) => setCrawl4aiUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCrawl4aiUrl()}
            />
            <button
              className="btn-primary btn-small"
              onClick={handleSaveCrawl4aiUrl}
              disabled={urlSaving || !crawl4aiUrl.trim()}
            >
              {urlSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Replacement Modal */}
      <ModelReplacementModal
        isOpen={replacementModal.isOpen}
        onClose={() => setReplacementModal({ isOpen: false, modelToRemove: null, dependencies: null })}
        modelToRemove={replacementModal.modelToRemove}
        dependencies={replacementModal.dependencies}
        availableModels={modelSettings?.model_pool || []}
        onSuccess={handleReplacementSuccess}
      />
    </div>
  );
}
