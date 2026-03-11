import React from 'react';
import './a4-paginated-editor.css';

const CSS_PIXELS_PER_MM = 96 / 25.4;
const A4_PAGE_HEIGHT_MM = 297;

interface A4PaginatedEditorProps {
  children: React.ReactNode;
}

function getA4PageHeightPx(): number {
  return A4_PAGE_HEIGHT_MM * CSS_PIXELS_PER_MM;
}

const A4PaginatedEditor: React.FC<A4PaginatedEditorProps> = ({ children }) => {
  const documentRef = React.useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = React.useState(1);

  React.useLayoutEffect(() => {
    const node = documentRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const pageHeightPx = getA4PageHeightPx();

    const updatePageCount = () => {
      const nextPageCount = Math.max(1, Math.ceil(node.scrollHeight / pageHeightPx));
      setPageCount((previousPageCount) => {
        return previousPageCount === nextPageCount ? previousPageCount : nextPageCount;
      });
    };

    updatePageCount();

    const resizeObserver = new ResizeObserver(() => {
      updatePageCount();
    });

    resizeObserver.observe(node);
    Array.from(node.children).forEach((childNode) => {
      resizeObserver.observe(childNode);
    });

    window.addEventListener('resize', updatePageCount);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePageCount);
    };
  }, []);

  const pageHeightPx = getA4PageHeightPx();
  const dividerOffsets = Array.from(
    { length: Math.max(0, pageCount - 1) },
    (_, index) => `${(index + 1) * pageHeightPx}px`
  );

  return (
    <div className="a4-editor-stage">
      <div className="a4-editor-stage__viewport">
        <div className="a4-editor-document" ref={documentRef}>
          {dividerOffsets.map((offset, index) => (
            <div
              key={`${offset}-${index}`}
              className="a4-editor-document__divider"
              style={{ top: offset }}
            />
          ))}
          <div className="a4-editor-document__content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default A4PaginatedEditor;
