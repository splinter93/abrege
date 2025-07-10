'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { sendPayloadToSynesia } from '../../../actions/synesia';
import { toast } from 'react-hot-toast';
import './SummaryPage.css';
import { motion } from 'framer-motion';
import { MdRefresh } from 'react-icons/md';
import '@/styles/markdown.css';

interface SummaryContentItem {
  type: 'paragraph' | 'takeaway' | 'list' | 'quote' | 'code';
  value?: string;
  title?: string;
  videoUrl?: string;
  items?: string[];
}

interface Summary {
  id: number;
  title: string;
  source: string;
  sourceUrl: string;
  category: string;
  publicationDate: string;
  content: SummaryContentItem[];
}

const mockSummary: Summary = {
  id: 1,
  title: 'La Seconde Guerre mondiale',
  source: 'Cours de M. Dupont',
  sourceUrl: '#',
  category: 'Histoire-Géo',
  publicationDate: '2023-09-15',
  content: [
    { type: 'paragraph', value: `La Seconde Guerre mondiale (1939-1945) est un conflit mondial majeur qui a opposé les Alliés et l'Axe. Elle a profondément marqué le XXe siècle.` },
    { type: 'takeaway', title: '1. Les causes du conflit', videoUrl: '' },
    { type: 'paragraph', value: `La montée des totalitarismes, la crise économique de 1929 et l'échec de la SDN sont à l'origine de la guerre.` },
    { type: 'list', items: [
        'Montée du nazisme en Allemagne',
        'Expansionnisme japonais en Asie',
        'Faiblesses des démocraties européennes'
    ]},
    { type: 'takeaway', title: '2. Les grandes phases de la guerre', videoUrl: '' },
    { type: 'paragraph', value: `Le conflit se divise en plusieurs phases : victoires de l'Axe, tournant de la guerre (1942-43), victoire des Alliés.` },
    { type: 'quote', value: `"La guerre est une chose trop grave pour la confier à des militaires."` },
    { type: 'takeaway', title: '3. Bilan et conséquences', videoUrl: '' },
    { type: 'paragraph', value: `La guerre a fait plus de 60 millions de morts et a conduit à la création de l'ONU.` },
    { type: 'code', value: `// Exercice : Citez deux conséquences majeures de la Seconde Guerre mondiale\n// 1. Création de l'ONU\n// 2. Début de la Guerre froide`},
    { type: 'paragraph', value: `Pour aller plus loin, consultez le manuel Histoire Terminale ES, chapitre 3.`},
  ],
};

const HEADER_IMAGES = [
  'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=3271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function getRandomImage(current: string) {
  const others = HEADER_IMAGES.filter(url => url !== current);
  return others[Math.floor(Math.random() * others.length)];
}

const YouTubePlayer: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  if (!videoUrl) return null;
  const url = new URL(videoUrl);
  const videoId = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
  const startTime = url.searchParams.get('t');
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1&rel=0`;
  return (
    <div className="video-player-container">
      <iframe
        src={embedUrl}
        frameBorder={0}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded YouTube Video"
      ></iframe>
    </div>
  );
};

const HeroCoverImage: React.FC<{ currentImage: string }> = ({ currentImage }) => {
  return (
    <div style={{ position: 'relative', width: '100vw', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', overflow: 'hidden', zIndex: 2 }}>
      <motion.img
        key={currentImage}
        src={currentImage + '?auto=format&fit=crop&w=1600&q=80'}
        className="hero-image"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.5 }}
        alt="Image de couverture"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      />
    </div>
  );
};

export default function SummaryPage() {
  const params = useParams();
  const id = params?.id as string;
  const [activeTakeawayIndex, setActiveTakeawayIndex] = useState<number | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState<boolean>(false);
  const [isPocasting, setIsPocasting] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string>(() => HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)]);
  const summary: Summary = mockSummary;

  const convertContentToMarkdown = (content: SummaryContentItem[]): string => {
    return content.map(item => {
      switch (item.type) {
        case 'takeaway':
          return `## ${item.title}`;
        case 'paragraph':
          return item.value?.replace(/<[^>]*>/g, '') ?? '';
        case 'list':
          return item.items?.map(li => `* ${li.replace(/<[^>]*>/g, '')}`).join('\n') ?? '';
        case 'quote':
          return `> ${item.value}`;
        case 'code':
          return "```\n" + (item.value ?? '') + "\n```";
        default:
          return '';
      }
    }).join('\n\n');
  };

  const handlePodcastClick = async () => {
    setIsPocasting(true);
    const customPayload = {
      title: summary.title,
      source: summary.source,
      topic: summary.category,
      text: convertContentToMarkdown(summary.content),
      model: 'podcast-fr-premium',
      referenceId: summary.id,
    };
    try {
      const result = await sendPayloadToSynesia(customPayload);
      if (result && result.audioB64) {
        const byteCharacters = atob(result.audioB64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/mp3' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      } else {
        toast.success("Le podcast arrive dans quelques instants !");
        console.warn("La réponse de l'API ne contenait pas de champ 'audioB64'.");
      }
    } catch (error) {
      console.error("Erreur lors de la création du podcast :", error);
      toast.error("Une erreur est survenue lors de la création du podcast.");
    } finally {
      setIsPocasting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleTakeawayClick = (index: number, videoUrl?: string) => {
    if (videoUrl) {
      const isOpeningNewVideo = activeTakeawayIndex !== index;
      setActiveTakeawayIndex(prev => prev === index ? null : index);
      if (isOpeningNewVideo) {
        setIsPlayerExpanded(false);
      }
    }
  };

  const formattedDate = new Date(summary.publicationDate).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const handleChangeCover = () => {
    setCoverImage(prev => getRandomImage(prev));
  };

  if (!summary) return <div>Loading summary...</div>;

  return (
    <div className="summary-page-container">
      <HeroCoverImage currentImage={coverImage} />
      <article className="summary-article markdown-body">
        <button className="hero-image-change-btn" onClick={handleChangeCover} style={{position:'absolute',top:0,right:0,margin:'12px 18px'}}>
          <MdRefresh size={20} style={{marginRight:6}} />
          Changer l'image
        </button>
        <header className="summary-header">
          <h1>{summary.title}</h1>
          <p className="summary-source">
            <a href={summary.sourceUrl} target="_blank" rel="noopener noreferrer">{summary.source}</a>
          </p>
          <div className="summary-details">
            <span className="summary-date">{formattedDate}</span>
            <span className="summary-category">{summary.category}</span>
          </div>
          <div className="podcast-button-container">
             {audioUrl ? (
              <audio controls src={audioUrl} className="custom-audio-player">
                Votre navigateur ne supporte pas l'élément audio.
              </audio>
            ) : (
              <button className="btn btn-primary" onClick={handlePodcastClick} disabled={isPocasting}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z"></path>
                  <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z"></path>
                </svg>
                <span>{isPocasting ? 'En cours...' : 'Podcaster'}</span>
              </button>
            )}
          </div>
        </header>
        <div className="summary-content">
          {summary.content.map((item, index) => {
            switch (item.type) {
              case 'paragraph':
                return <p key={index} dangerouslySetInnerHTML={{ __html: item.value ?? '' }} />;
              case 'quote':
                return (
                  <blockquote key={index}>
                    <span className="quote-text" dangerouslySetInnerHTML={{ __html: item.value ?? '' }} />
                  </blockquote>
                );
              case 'list':
                return <ul key={index}>{item.items?.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}</ul>;
              case 'code':
                return <pre key={index}><code>{item.value}</code></pre>;
              case 'takeaway':
                return (
                  <div key={index}>
                    <h2
                      className={item.videoUrl ? 'takeaway-title clickable' : 'takeaway-title'}
                      onClick={() => handleTakeawayClick(index, item.videoUrl)}
                    >
                      {item.title}
                    </h2>
                    {activeTakeawayIndex === index && (
                      <div className={`video-player-wrapper ${isPlayerExpanded ? 'expanded' : ''}`}>
                        <YouTubePlayer videoUrl={item.videoUrl ?? ''} />
                        <div className="video-controls">
                           <button onClick={() => setIsPlayerExpanded(!isPlayerExpanded)} className="video-control-button" title={isPlayerExpanded ? 'Réduire' : 'Agrandir'}>
                             {isPlayerExpanded ? (
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                             ) : (
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                             )}
                           </button>
                           <button onClick={() => setActiveTakeawayIndex(null)} className="video-control-button" title="Fermer">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </article>
    </div>
  );
} 