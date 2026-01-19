import React, { useState, useEffect } from 'react';
import {
  Network,
  RotateCcw,
  Users,
  Wand2,
  GraduationCap,
  Star,
  Sparkles,
  Check,
} from 'lucide-react';
import { api } from '../api';
import './BrainstormStyleSelector.css';

// Map icon names to Lucide components
const ICON_MAP = {
  network: Network,
  'rotate-ccw': RotateCcw,
  users: Users,
  'wand-2': Wand2,
  'graduation-cap': GraduationCap,
  star: Star,
  sparkles: Sparkles,
};

/**
 * BrainstormStyleSelector - Single-select style cards for Sleep Time Compute
 */
export default function BrainstormStyleSelector({
  selectedStyle,
  onStyleSelect,
  disabled = false,
}) {
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const result = await api.listBrainstormStyles();
      // Filter to only enabled styles
      const enabledStyles = (result.styles || []).filter(s => s.enabled !== false);
      setStyles(enabledStyles);
    } catch (err) {
      console.error('Failed to load brainstorm styles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Sparkles;
    return <IconComponent size={24} />;
  };

  if (loading) {
    return (
      <div className="brainstorm-style-selector loading">
        <div className="brainstorm-style-loading">Loading styles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="brainstorm-style-selector error">
        <div className="brainstorm-style-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="brainstorm-style-selector">
      <div className="brainstorm-style-label">Brainstorming Style</div>
      <div className="brainstorm-style-grid">
        {styles.map((style) => {
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              className={`brainstorm-style-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onStyleSelect(style.id)}
              disabled={disabled}
              title={style.description}
            >
              <div className="brainstorm-style-icon">
                {getIcon(style.icon)}
              </div>
              <div className="brainstorm-style-name">
                {style.name}
              </div>
              <div className="brainstorm-style-description">
                {style.description}
              </div>
              {style.turn_pattern && (
                <div className="brainstorm-style-pattern">
                  {style.turn_pattern.join(' → ')}
                </div>
              )}
              {isSelected && (
                <div className="brainstorm-style-check">
                  <Check size={16} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
