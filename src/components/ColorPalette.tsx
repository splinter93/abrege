import React from 'react';
import './ColorPalette.css';

export interface ColorPaletteProps {
  colors: string[];
  onSelect: (color: string) => void;
  selectedColor?: string;
  [key: string]: any;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, onSelect, selectedColor, ...props }) => {
  return (
    <div className="color-palette" {...props}>
      {colors.map((color) => (
        <button
          key={color}
          className={`color-swatch${selectedColor === color ? ' selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
};

export default ColorPalette; 