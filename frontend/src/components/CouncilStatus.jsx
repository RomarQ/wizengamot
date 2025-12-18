import { useState, useEffect, useRef } from 'react';
import './CouncilStatus.css';

const STAGE_MESSAGES = {
  1: [
    "Gathering thoughts...",
    "Quills scratching...",
    "Consulting the tomes...",
    "Adjusting spectacles...",
    "Clearing throats...",
    "Sharpening quills...",
    "Unfurling scrolls...",
    "Pondering deeply...",
  ],
  2: [
    "Heated debates...",
    "Deliberating...",
    "Fingers pointed...",
    "Order! Order!",
    "Ballots shuffling...",
    "Whispered conspiracies...",
    "Ancient precedent invoked...",
    "Objection overruled...",
    "Suspicious silence...",
    "Dramatic pause...",
    "Eyebrows raised...",
    "Weighing opinions...",
  ],
  3: [
    "Chairman clears throat...",
    "Gavels raised...",
    "Verdict approaches...",
    "Consensus forming...",
    "Drafting the decree...",
    "Preparing the seal...",
    "Locating the stamp...",
    "Flourishing signatures...",
  ],
  bonus: [
    "Tea break...",
    "Bathroom break...",
    "Cat took the chair...",
    "Owl delivery...",
    "Doodling in margins...",
    "Snack break...",
    "Ink spilled...",
    "Checking hourglass...",
  ],
};

// SVG icons matching app's minimalistic style
const STAGE_ICONS = {
  1: ( // Scroll icon
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 0 1-2 2Z"/>
      <path d="M4 11V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2"/>
      <path d="M8 21a2 2 0 0 1-2-2v-8"/>
    </svg>
  ),
  2: ( // Scales icon
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v18"/>
      <path d="M3 7l4 10h0a4 4 0 0 0 8 0h0L19 7"/>
      <path d="M3 7h4m10 0h4"/>
    </svg>
  ),
  3: ( // Wand/magic icon
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 4V2"/>
      <path d="M15 16v-2"/>
      <path d="M8 9h2"/>
      <path d="M20 9h2"/>
      <path d="M17.8 11.8L19 13"/>
      <path d="M15 9h0"/>
      <path d="M17.8 6.2L19 5"/>
      <path d="m3 21 9-9"/>
      <path d="M12.2 6.2L11 5"/>
    </svg>
  ),
};

const STAGE_INFO = {
  1: { name: 'GATHERING THOUGHTS' },
  2: { name: 'PEER DELIBERATION' },
  3: { name: 'FINAL SYNTHESIS' },
};

// Helper function to pick a message
const pickMessage = (stage) => {
  const useBonus = Math.random() < 0.15;
  const pool = useBonus ? STAGE_MESSAGES.bonus : STAGE_MESSAGES[stage];
  return pool[Math.floor(Math.random() * pool.length)];
};

export default function CouncilStatus({ stage }) {
  // Initialize with a message for this stage using lazy initialization
  const [message, setMessage] = useState(() => pickMessage(stage));
  const [isVisible, setIsVisible] = useState(true);
  const prevStageRef = useRef(stage);

  // Handle stage changes and message rotation
  useEffect(() => {
    // If stage changed, pick a new message immediately
    if (prevStageRef.current !== stage) {
      prevStageRef.current = stage;
      // Schedule the state update for next tick to avoid direct setState in effect
      const resetTimeout = setTimeout(() => {
        setMessage(pickMessage(stage));
        setIsVisible(true);
      }, 0);
      return () => clearTimeout(resetTimeout);
    }

    // Set up interval for rotating messages
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setMessage(pickMessage(stage));
        setIsVisible(true);
      }, 300);
    }, 3500);

    return () => clearInterval(interval);
  }, [stage]);

  const { name } = STAGE_INFO[stage];

  return (
    <div className="council-status">
      <div className="council-status-header">
        <span className="stage-icon">{STAGE_ICONS[stage]}</span>
        <span className="stage-name">STAGE {stage}: {name}</span>
      </div>
      <div className="council-status-body">
        <div className="spinner"></div>
        <span className={`council-status-message ${isVisible ? 'visible' : ''}`}>
          {message}
        </span>
      </div>
      <div className="stage-progress">
        <span className={`progress-dot ${stage >= 1 ? 'active' : ''}`}>●</span>
        <span className="progress-line"></span>
        <span className={`progress-dot ${stage >= 2 ? 'active' : ''}`}>●</span>
        <span className="progress-line"></span>
        <span className={`progress-dot ${stage >= 3 ? 'active' : ''}`}>○</span>
      </div>
    </div>
  );
}
