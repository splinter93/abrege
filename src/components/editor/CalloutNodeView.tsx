import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { FiEdit3, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface CalloutNodeViewProps {
  node: ProseMirrorNode;
  updateAttributes: (attrs: { type?: string; title?: string }) => void;
  deleteNode: () => void;
  editor: NodeViewProps['editor'];
}

const CalloutNodeView: React.FC<CalloutNodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  editor
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(node.attrs.title || '');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { type } = node.attrs;

  // Icônes par type
  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
      note: '📝',
      tip: '💡',
    };
    return icons[type] || '📝';
  };

  // Titres par défaut
  const getDefaultTitle = (type: string) => {
    const titles: Record<string, string> = {
      info: 'Information',
      warning: 'Attention',
      error: 'Erreur',
      success: 'Succès',
      note: 'Note',
      tip: 'Conseil',
    };
    return titles[type] || 'Note';
  };

  const defaultTitle = getDefaultTitle(type);
  const displayTitle = title || defaultTitle;

  // Focus sur l'input quand on commence l'édition
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    updateAttributes({ title: title.trim() || undefined });
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitle(node.attrs.title || '');
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  const handleTypeChange = (newType: string) => {
    updateAttributes({ type: newType });
  };

  return (
    <NodeViewWrapper
      as="div"
      className={`callout callout-${type} ${isCollapsed ? 'collapsed' : ''}`}
      data-type={type}
      data-title={displayTitle}
    >
      <div className="callout-header">
        <button
          className="callout-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Développer' : 'Réduire'}
        >
          {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
        </button>

        <div className="callout-icon">
          {getIcon(type)}
        </div>

        <div className="callout-title-container">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className="callout-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleKeyDown}
              placeholder={defaultTitle}
            />
          ) : (
            <div
              className="callout-title"
              onClick={handleTitleEdit}
              title="Cliquer pour modifier le titre"
            >
              {displayTitle}
            </div>
          )}
        </div>

        <div className="callout-actions">
          <div className="callout-type-select-wrap" style={{ position: 'relative' }}>
            <select
              className="callout-type-select"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              title="Changer le type"
              style={{ paddingRight: '2rem', appearance: 'none' }}
            >
              <option value="info">ℹ️ Information</option>
              <option value="warning">⚠️ Attention</option>
              <option value="error">❌ Erreur</option>
              <option value="success">✅ Succès</option>
              <option value="note">📝 Note</option>
              <option value="tip">💡 Conseil</option>
            </select>
            <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'currentColor', opacity: 0.7 }} aria-hidden>
              <FiChevronDown size={14} />
            </span>
          </div>

          <button
            className="callout-edit-btn"
            onClick={handleTitleEdit}
            title="Modifier le titre"
          >
            <FiEdit3 size={14} />
          </button>

          <button
            className="callout-delete-btn"
            onClick={deleteNode}
            title="Supprimer le callout"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="callout-content">
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default CalloutNodeView;
