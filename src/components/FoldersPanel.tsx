import React from 'react';
import Link from 'next/link';
import './FoldersPanel.css';

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

interface Folder {
    id: string;
    name: string;
}

interface FoldersPanelProps {
    isOpen: boolean;
}

const FoldersPanel: React.FC<FoldersPanelProps> = ({ isOpen }) => {
    // Données mockées
    const folders: Folder[] = [
        { id: 'hist-geo', name: 'Histoire-Géo' },
        { id: 'ses', name: 'SES' },
        { id: 'philo', name: 'Philosophie' },
        { id: 'maths', name: 'Mathématiques' },
        { id: 'anglais', name: 'Anglais' },
        { id: 'espagnol', name: 'Espagnol' },
    ];

    return (
        <div className={`folders-panel ${isOpen ? 'open' : ''}`}>
            <div className="panel-inner-wrapper">
                <div className="panel-header">
                    <h2>Mes Dossiers</h2>
                    <button className="btn-icon">
                        <PlusIcon />
                    </button>
                </div>
                <div className="panel-content">
                    <ul className="folders-list">
                        {folders.map(folder => (
                            <li key={folder.id}>
                                <Link href={`/dossiers/${folder.id}`} className="folder-item">
                                    {folder.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default FoldersPanel; 