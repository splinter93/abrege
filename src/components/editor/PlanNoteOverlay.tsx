'use client';

import React from 'react';
import { ClipboardList, Lock, Unlock, CheckCircle2 } from 'lucide-react';

interface PlanNoteOverlayProps {
  isEditUnlocked: boolean;
  onToggleEdit: () => void;
  completedCount: number;
  totalCount: number;
}

const PlanNoteOverlay: React.FC<PlanNoteOverlayProps> = ({
  isEditUnlocked,
  onToggleEdit,
  completedCount,
  totalCount,
}) => {
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="plan-note-overlay">
      <div className="plan-note-overlay-left">
        <span className="plan-note-badge">
          <ClipboardList size={14} />
          Plan
        </span>
        {totalCount > 0 && (
          <span className="plan-note-progress">
            <CheckCircle2 size={13} />
            {completedCount}/{totalCount}
            <span className="plan-note-progress-bar">
              <span
                className="plan-note-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </span>
          </span>
        )}
      </div>
      <button
        className="plan-note-edit-toggle"
        onClick={onToggleEdit}
        title={isEditUnlocked ? 'Verrouiller (lecture seule)' : 'Déverrouiller (éditer)'}
      >
        {isEditUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
        {isEditUnlocked ? 'Verrouiller' : 'Éditer'}
      </button>
    </div>
  );
};

export default PlanNoteOverlay;
