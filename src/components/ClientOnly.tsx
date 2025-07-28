'use client';

import React, { useState, useEffect } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
}

/**
 * Ce composant garantit que ses enfants ne sont rendus que côté client.
 * C'est utile pour éviter les erreurs d'hydratation de React lorsque des
 * extensions de navigateur (comme LastPass) modifient le DOM.
 */
const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default ClientOnly; 