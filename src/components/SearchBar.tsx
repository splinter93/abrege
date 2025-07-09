import React, { useState } from 'react';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState<string>('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: '1rem' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--text-secondary)' }}><path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <input
        type="search"
        placeholder="Search your video library..."
        value={query}
        onChange={handleChange}
        className="input-base"
        style={{ padding: 0, border: 'none', background: 'transparent' }}
      />
    </div>
  );
};

export default SearchBar; 