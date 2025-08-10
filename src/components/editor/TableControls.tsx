import React from 'react';
import type { Editor } from '@tiptap/react';
import './table-controls.css';

type TableControlsProps = {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLElement>;
  hidden?: boolean;
};

function getClosestCell(el: Node | null): HTMLElement | null {
  let node: any = el instanceof HTMLElement ? el : (el as any)?.nodeType ? (el as any) : null;
  if (!node && (el as any) && (el as any).node) node = (el as any).node as Node;
  while (node && node.nodeType === 3) node = node.parentElement; // text → element
  let cur: HTMLElement | null = node instanceof HTMLElement ? node : null;
  while (cur) {
    if (cur.tagName === 'TD' || cur.tagName === 'TH') return cur;
    cur = cur.parentElement;
  }
  return null;
}

export default function TableControls({ editor, containerRef, hidden }: TableControlsProps) {
  const [visible, setVisible] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = React.useCallback(() => {
    if (!editor || !containerRef.current) { setVisible(false); return; }
    const view = (editor as any).view as import('prosemirror-view').EditorView;
    const { state } = view;
    const sel = state.selection;
    // find DOM node at current selection
    let domAt: any = null;
    try { domAt = view.domAtPos(sel.from); } catch {}
    const containerRect = containerRef.current.getBoundingClientRect();
    const cell = getClosestCell(domAt ? (domAt.node as Node) : null);
    if (!cell) { setVisible(false); return; }
    const tableWrapper = cell.closest('.tableWrapper') || cell.closest('table');
    if (!tableWrapper) { setVisible(false); return; }
    const rect = (tableWrapper as HTMLElement).getBoundingClientRect();
    // position near top-right of the table wrapper
    const top = rect.top - containerRect.top - 10;  // 10px above
    const left = rect.right - containerRect.left - 10 - 160; // width ~160px including padding
    setPos({ top: Math.max(top, 0), left: Math.max(left, 0) });
    setVisible(true);
  }, [editor, containerRef]);

  React.useEffect(() => {
    if (!editor) return;
    const off1 = (editor as any).on?.('selectionUpdate', updatePosition);
    const off2 = (editor as any).on?.('transaction', updatePosition);
    const off3 = (editor as any).on?.('update', updatePosition);
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      if (typeof off1 === 'function') off1();
      if (typeof off2 === 'function') off2();
      if (typeof off3 === 'function') off3();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [editor, updatePosition]);

  if (!editor || hidden) return null;
  if (!visible) return null;

  const canAddRowBefore = !!editor && !!(editor as any).can?.().chain().focus().addRowBefore().run();
  const canAddRowAfter = !!editor && !!(editor as any).can?.().chain().focus().addRowAfter().run();
  const canAddColBefore = !!editor && !!(editor as any).can?.().chain().focus().addColumnBefore().run();
  const canAddColAfter = !!editor && !!(editor as any).can?.().chain().focus().addColumnAfter().run();

  const addRowAbove = () => (editor as any).chain().focus().addRowBefore().run();
  const addRowBelow = () => (editor as any).chain().focus().addRowAfter().run();
  const addColLeft = () => (editor as any).chain().focus().addColumnBefore().run();
  const addColRight = () => (editor as any).chain().focus().addColumnAfter().run();

  return (
    <div className="table-controls" style={{ top: pos.top, left: pos.left }}>
      <div className="table-controls-row">
        <button
          type="button"
          className="table-controls-btn"
          onClick={addRowAbove}
          disabled={!canAddRowBefore}
          title="Ajouter une ligne au-dessus"
        >+ ligne ↑</button>
        <button
          type="button"
          className="table-controls-btn"
          onClick={addRowBelow}
          disabled={!canAddRowAfter}
          title="Ajouter une ligne en dessous"
        >+ ligne ↓</button>
      </div>
      <div className="table-controls-row">
        <button
          type="button"
          className="table-controls-btn"
          onClick={addColLeft}
          disabled={!canAddColBefore}
          title="Ajouter une colonne à gauche"
        >+ col ←</button>
        <button
          type="button"
          className="table-controls-btn"
          onClick={addColRight}
          disabled={!canAddColAfter}
          title="Ajouter une colonne à droite"
        >+ col →</button>
      </div>
    </div>
  );
} 