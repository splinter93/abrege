'use client';
import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import './ContentCard.css';

export interface ContentCardProps {
  data: {
    id: string | number;
    imageUrl: string;
    category: string;
    title: string;
    source: string;
    duration: string;
    readTime: string;
  };
  onClick?: () => void;
  [key: string]: unknown;
}

const ContentCard: React.FC<ContentCardProps> = ({ data, onClick, ...props }) => {
  const { id, imageUrl, category, title, source, duration, readTime } = data;

  return (
    <div className="content-card" onClick={onClick} {...props}>
      <div className="card-image-container">
        <img src={imageUrl} alt={title} className="card-image" />
        <span className="card-category-tag">{category}</span>
      </div>
      <div className="card-info">
        <h3 className="card-title">{title}</h3>
        <p className="card-source">{source}</p>
        <div className="card-meta">
          <div className="card-meta-time">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{duration} • {readTime}</span>
          </div>
          <Link href={`/summary/${id}`} className="read-button-link">
            <button className="read-button">Read</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

ContentCard.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    imageUrl: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    readTime: PropTypes.string.isRequired,
  }).isRequired,
};

export default ContentCard;
