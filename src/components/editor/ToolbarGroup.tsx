/**
 * ToolbarGroup - Groupe de boutons dans la toolbar
 * @module components/editor/ToolbarGroup
 */

import React from 'react';

interface ToolbarGroupProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const ToolbarGroup: React.FC<ToolbarGroupProps> = ({ 
  children, 
  align = 'left',
  className = '' 
}) => {
  const alignClass = `toolbar-group--${align}`;
  
  return (
    <div className={`toolbar-group ${alignClass} ${className}`.trim()}>
      {children}
    </div>
  );
};

export default ToolbarGroup;

