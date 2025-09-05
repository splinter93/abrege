import React from 'react';
import { Editor } from '@tiptap/react';
import { FiChevronDown, FiList, FiHash, FiCheckSquare } from 'react-icons/fi';

interface ListDropdownProps {
  editor: Editor;
}

const ListDropdown: React.FC<ListDropdownProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const listTypes = [
    { 
      type: 'bulletList', 
      label: 'Bullet List', 
      icon: FiList,
      command: () => editor.chain().focus().toggleBulletList().run()
    },
    { 
      type: 'orderedList', 
      label: 'Numbered List', 
      icon: FiHash,
      command: () => editor.chain().focus().toggleOrderedList().run()
    },
    { 
      type: 'taskList', 
      label: 'Task List', 
      icon: FiCheckSquare,
      command: () => editor.chain().focus().toggleTaskList().run()
    },
  ];

  const getCurrentListType = () => {
    if (!editor) return null;
    if (editor.isActive('bulletList')) return listTypes[0];
    if (editor.isActive('orderedList')) return listTypes[1];
    if (editor.isActive('taskList')) return listTypes[2];
    return null;
  };

  const currentListType = getCurrentListType();
  const CurrentIcon = currentListType?.icon || FiList;

  const handleListChange = (command: () => void) => {
    if (!editor) return;
    command();
    setIsOpen(false);
  };

  return (
    <div className="list-dropdown">
      <button
        className="list-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      >
        <CurrentIcon className="list-dropdown-icon" />
        <span className="list-dropdown-label">
          {currentListType ? currentListType.label : 'Lists'}
        </span>
        <FiChevronDown className={`list-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="list-dropdown-menu">
          {listTypes.map((listType) => {
            const Icon = listType.icon;
            const isActive = editor.isActive(listType.type);
            return (
              <button
                key={listType.type}
                className={`list-dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleListChange(listType.command)}
              >
                <Icon className="list-dropdown-item-icon" />
                <span className="list-dropdown-item-label">{listType.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListDropdown;
