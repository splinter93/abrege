import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FiPlus, FiTrash2, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './table-controls.css';
import type { Editor } from '@tiptap/react';
import { logger, LogCategory } from '@/utils/logger';

interface TableControlsProps {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLElement>;
}

interface Position {
  top: number;
  left: number;
}

const TableControls: React.FC<TableControlsProps> = ({ editor, containerRef }) => {
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [selectionVersion, setSelectionVersion] = useState(0);

  const findTableAtCursor = useCallback((): HTMLTableElement | null => {
    if (!editor || !containerRef.current) {
      return null;
    }

    try {
      const { state, view } = editor;
      const { from } = state.selection;
      const domAtPos = view.domAtPos(from);
      let element: HTMLElement | null = null;

      if (domAtPos.node instanceof HTMLElement) {
        element = domAtPos.node;
      } else if (domAtPos.node?.parentElement) {
        element = domAtPos.node.parentElement;
      }

      while (element && element !== containerRef.current) {
        if (element.tagName === 'TABLE') {
          return element as HTMLTableElement;
        }
        element = element.parentElement;
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur recherche table courante', error);
    }

    return null;
  }, [editor, containerRef]);

  const updatePosition = useCallback(() => {
    if (!editor || !containerRef.current) {
      setIsVisible(false);
      return;
    }

    try {
      const table = findTableAtCursor();
      if (!table) {
        setIsVisible(false);
        return;
      }

      const rect = table.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setPos({
        top: rect.top - containerRect.top - 48,
        left: rect.left - containerRect.left + rect.width / 2 - 72,
      });
      setIsVisible(true);
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de la mise à jour de la position des contrôles de tableau', error);
    }
  }, [editor, containerRef, findTableAtCursor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleSelectionUpdate = () => {
      if (editor.isFocused && editor.state.selection) {
        updatePosition();
        setSelectionVersion((version) => version + 1);
      }
    };

    const handleFocus = () => {
      updatePosition();
      setSelectionVersion((version) => version + 1);
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
    };
  }, [editor, updatePosition]);

  const tablePermissions = useMemo(() => {
    if (!editor) {
      return {
        canAddRowBefore: false,
        canAddRowAfter: false,
        canAddColBefore: false,
        canAddColAfter: false,
        canDeleteRow: false,
        canDeleteCol: false,
        canMergeCells: false,
        canSplitCell: false,
        canDeleteTable: false,
      };
    }

    try {
      return {
        canAddRowBefore: !!editor.can?.().chain().focus().addRowBefore().run(),
        canAddRowAfter: !!editor.can?.().chain().focus().addRowAfter().run(),
        canAddColBefore: !!editor.can?.().chain().focus().addColumnBefore().run(),
        canAddColAfter: !!editor.can?.().chain().focus().addColumnAfter().run(),
        canDeleteRow: !!editor.can?.().chain().focus().deleteRow().run(),
        canDeleteCol: !!editor.can?.().chain().focus().deleteColumn().run(),
        canMergeCells: !!editor.can?.().chain().focus().mergeCells().run(),
        canSplitCell: !!editor.can?.().chain().focus().splitCell().run(),
        canDeleteTable: !!editor.can?.().chain().focus().deleteTable().run(),
      };
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur calcul permissions tableau:', error);
      return {
        canAddRowBefore: false,
        canAddRowAfter: false,
        canAddColBefore: false,
        canAddColAfter: false,
        canDeleteRow: false,
        canDeleteCol: false,
        canMergeCells: false,
        canSplitCell: false,
        canDeleteTable: false,
      };
    }
  }, [editor, selectionVersion]);

  const { 
    canAddRowBefore, 
    canAddRowAfter, 
    canAddColBefore, 
    canAddColAfter,
    canDeleteRow,
    canDeleteCol,
    canMergeCells,
    canSplitCell,
    canDeleteTable,
  } = tablePermissions;

  const addRowAbove = () => {
    editor?.chain().focus().addRowBefore().run();
  };

  const addRowBelow = () => {
    editor?.chain().focus().addRowAfter().run();
  };

  const addColLeft = () => {
    editor?.chain().focus().addColumnBefore().run();
  };

  const addColRight = () => {
    editor?.chain().focus().addColumnAfter().run();
  };

  const deleteRow = () => {
    editor?.chain().focus().deleteRow().run();
  };

  const deleteColumn = () => {
    editor?.chain().focus().deleteColumn().run();
  };

  const mergeCells = () => {
    editor?.chain().focus().mergeCells().run();
  };

  const splitCell = () => {
    editor?.chain().focus().splitCell().run();
  };

  const deleteTable = () => {
    editor?.chain().focus().deleteTable().run();
  };

  const withEditorFocus = useCallback(
    (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    []
  );

  if (!isVisible || !editor) {
    return null;
  }

  return (
    <div className="table-controls" style={{ top: pos.top, left: pos.left }}>
      <div className="table-controls-group">
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(addRowAbove)}
          disabled={!canAddRowBefore}
          title="Ajouter une ligne au-dessus"
        >
          <FiPlus size={14} />
        </button>
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(addRowBelow)}
          disabled={!canAddRowAfter}
          title="Ajouter une ligne en-dessous"
        >
          <FiPlus size={14} />
        </button>
      </div>
      <div className="table-controls-group">
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(deleteRow)}
          disabled={!canDeleteRow}
          title="Supprimer la ligne"
        >
          <FiTrash2 size={14} />
        </button>
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(deleteColumn)}
          disabled={!canDeleteCol}
          title="Supprimer la colonne"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
      <div className="table-controls-group">
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(addColLeft)}
          disabled={!canAddColBefore}
          title="Ajouter une colonne à gauche"
        >
          <FiPlus size={14} />
        </button>
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(addColRight)}
          disabled={!canAddColAfter}
          title="Ajouter une colonne à droite"
        >
          <FiPlus size={14} />
        </button>
      </div>
      <div className="table-controls-group">
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(mergeCells)}
          disabled={!canMergeCells}
          title="Fusionner les cellules"
        >
          <FiMaximize2 size={14} />
        </button>
        <button
          className="table-control-btn"
          onMouseDown={withEditorFocus(splitCell)}
          disabled={!canSplitCell}
          title="Scinder la cellule"
        >
          <FiMinimize2 size={14} />
        </button>
        <button
          className="table-control-btn table-control-danger"
          onMouseDown={withEditorFocus(deleteTable)}
          disabled={!canDeleteTable}
          title="Supprimer le tableau"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default TableControls;