import React, { useState } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: string;
  [key: string]: unknown;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top', ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="custom-tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative', display: 'inline-block' }}
      {...props}
    >
      {children}
      {visible && (
        <span className={`custom-tooltip-bubble custom-tooltip-${position}`}>
          {text}
        </span>
      )}
    </span>
  );
};

export default Tooltip; 