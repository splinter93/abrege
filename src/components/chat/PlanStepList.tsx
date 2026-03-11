'use client';

import React from 'react';
import { Circle, Loader2, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="plan-step-list">
      {title && (
        <div className="plan-step-list-header">
          <span className="plan-step-list-title">{title}</span>
          <span className="plan-step-list-counter">{completed}/{steps.length}</span>
        </div>
      )}
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
