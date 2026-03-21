'use client';

import React from 'react';
import { Circle, Loader2, CheckCircle2, ListOrdered } from 'lucide-react';
import './PlanStepList.css';

interface PlanStep {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface PlanStepListProps {
  title?: string;
  steps: PlanStep[];
}

const STATUS_ICON: Record<PlanStep['status'], React.ReactNode> = {
  pending: <Circle size={14} className="plan-step-icon plan-step-icon--pending" />,
  in_progress: <Loader2 size={14} className="plan-step-icon plan-step-icon--active spin" />,
  completed: <CheckCircle2 size={14} className="plan-step-icon plan-step-icon--done" />,
};

const PlanStepList: React.FC<PlanStepListProps> = ({ title, steps }) => {
  const completed = steps.filter(s => s.status === 'completed').length;
  const headerTitle = title?.trim() ? title.trim() : 'Plan';
  const allDone = steps.length > 0 && completed === steps.length;

  return (
    <div className="plan-step-list">
      <div className="plan-step-list-header">
        <div className="plan-step-list-title-group">
          <ListOrdered size={16} className="plan-step-list-title-icon" aria-hidden />
          <span className="plan-step-list-title">{headerTitle}</span>
        </div>
        <div className="plan-step-list-header-meta">
          {allDone && (
            <span className="plan-step-list-completed-label">
              <CheckCircle2 size={14} className="plan-step-list-completed-icon" aria-hidden />
              Completed
            </span>
          )}
          <span
            className={`plan-step-list-counter${allDone ? ' plan-step-list-counter--complete' : ''}`}
          >
            {completed}/{steps.length}
          </span>
        </div>
      </div>
      <div className="plan-step-list-items">
        {steps.map((step) => (
          <div key={step.id} className={`plan-step-item plan-step-item--${step.status}`}>
            {STATUS_ICON[step.status]}
            <span className="plan-step-text">{step.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanStepList;
