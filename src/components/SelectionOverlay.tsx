import React, { useState, useEffect } from 'react';

export interface SelectionOverlayProps {
  selected: boolean;
  onDeselect: () => void;
  children: React.ReactNode;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ selected, onDeselect, children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Delay mounting Selecto to ensure DOM is ready
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!selected) return <>{children}</>;
  return (
    <div className="selection-overlay" onClick={onDeselect}>
      {children}
      <div className="overlay" />
    </div>
  );
};

export default SelectionOverlay; 