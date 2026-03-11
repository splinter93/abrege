'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { CheckCircle2, XCircle, Code2, Eye, RotateCcw } from 'lucide-react';

interface QcmQuestion {
  id: string;
  title: string;
  options: Array<{ label: string; isCorrect: boolean }>;
  isMultiple: boolean;
}

interface QcmNoteRendererProps {
  markdownContent: string;
  onSwitchToEditor?: () => void;
}

function parseQcmMarkdown(md: string): { title: string; questions: QcmQuestion[] } {
  const lines = md.split('\n');
  let quizTitle = '';
  const questions: QcmQuestion[] = [];
  let currentQ: QcmQuestion | null = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    if (h1 && !quizTitle) {
      quizTitle = h1[1].trim();
      continue;
    }

    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      if (currentQ) questions.push(currentQ);
      currentQ = {
        id: `q${questions.length + 1}`,
        title: h2[1].trim(),
        options: [],
        isMultiple: false,
      };
      continue;
    }

    const checkbox = line.match(/^- \[([ xX])\]\s+(.+)/);
    if (checkbox && currentQ) {
      const isCorrect = checkbox[1].toLowerCase() === 'x';
      currentQ.options.push({ label: checkbox[2].trim(), isCorrect });
      if (isCorrect && currentQ.options.filter(o => o.isCorrect).length > 1) {
        currentQ.isMultiple = true;
      }
      continue;
    }

    if (currentQ && line.trim() && !line.startsWith('#') && !line.startsWith('-')) {
      currentQ.title += ' ' + line.trim();
    }
  }
  if (currentQ) questions.push(currentQ);

  return { title: quizTitle, questions };
}

const QcmNoteRenderer: React.FC<QcmNoteRendererProps> = ({ markdownContent, onSwitchToEditor }) => {
  const { title, questions } = useMemo(() => parseQcmMarkdown(markdownContent), [markdownContent]);

  const [selections, setSelections] = useState<Record<string, Set<number>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const handleSelect = useCallback((qId: string, optIdx: number, isMultiple: boolean) => {
    if (submitted) return;
    setSelections(prev => {
      const next = { ...prev };
      if (isMultiple) {
        const set = new Set(prev[qId] || []);
        if (set.has(optIdx)) set.delete(optIdx);
        else set.add(optIdx);
        next[qId] = set;
      } else {
        next[qId] = new Set([optIdx]);
      }
      return next;
    });
  }, [submitted]);

  const score = useMemo(() => {
    if (!submitted) return { correct: 0, total: questions.length };
    let correct = 0;
    for (const q of questions) {
      const selected = selections[q.id] || new Set();
      const correctIndices = new Set(q.options.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0));
      if (selected.size === correctIndices.size && [...selected].every(i => correctIndices.has(i))) {
        correct++;
      }
    }
    return { correct, total: questions.length };
  }, [submitted, questions, selections]);

  const handleReset = () => {
    setSelections({});
    setSubmitted(false);
  };

  if (showSource) {
    return (
      <div className="qcm-note-renderer">
        <div className="qcm-note-toolbar">
          <span className="qcm-note-badge">QCM</span>
          <button className="qcm-note-toggle" onClick={() => setShowSource(false)}>
            <Eye size={14} /> Aperçu
          </button>
        </div>
        <pre className="qcm-note-source"><code>{markdownContent}</code></pre>
      </div>
    );
  }

  return (
    <div className="qcm-note-renderer">
      <div className="qcm-note-toolbar">
        <div className="qcm-note-toolbar-left">
          <span className="qcm-note-badge">QCM</span>
          {submitted && (
            <span className="qcm-note-score">
              Score : {score.correct}/{score.total}
            </span>
          )}
        </div>
        <div className="qcm-note-toolbar-right">
          {submitted && (
            <button className="qcm-note-toggle" onClick={handleReset}>
              <RotateCcw size={14} /> Recommencer
            </button>
          )}
          <button className="qcm-note-toggle" onClick={() => setShowSource(true)}>
            <Code2 size={14} /> Source
          </button>
        </div>
      </div>

      <div className="qcm-note-content">
        {title && <h1 className="qcm-note-title">{title}</h1>}

        {questions.map((q) => {
          const selected = selections[q.id] || new Set();
          return (
            <div key={q.id} className="qcm-question">
              <h3 className="qcm-question-title">{q.title}</h3>
              <div className="qcm-options">
                {q.options.map((opt, i) => {
                  const isSelected = selected.has(i);
                  let stateClass = '';
                  if (submitted) {
                    if (opt.isCorrect) stateClass = 'qcm-option--correct';
                    else if (isSelected && !opt.isCorrect) stateClass = 'qcm-option--wrong';
                  }
                  return (
                    <label
                      key={i}
                      className={`qcm-option ${isSelected ? 'qcm-option--selected' : ''} ${stateClass} ${submitted ? 'qcm-option--submitted' : ''}`}
                      onClick={() => handleSelect(q.id, i, q.isMultiple)}
                    >
                      <span className="qcm-option-indicator">
                        {submitted && opt.isCorrect && <CheckCircle2 size={16} />}
                        {submitted && isSelected && !opt.isCorrect && <XCircle size={16} />}
                        {!submitted && (
                          <span className={`qcm-option-radio ${q.isMultiple ? 'qcm-option-checkbox' : ''} ${isSelected ? 'qcm-option-radio--checked' : ''}`} />
                        )}
                      </span>
                      <span className="qcm-option-label">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!submitted && questions.length > 0 && (
          <button
            className="qcm-submit-btn"
            onClick={() => setSubmitted(true)}
            disabled={Object.keys(selections).length === 0}
          >
            Valider mes réponses
          </button>
        )}
      </div>
    </div>
  );
};

export default QcmNoteRenderer;
