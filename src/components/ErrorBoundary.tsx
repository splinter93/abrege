import React, { Component, ReactNode, ErrorInfo } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error if needed
    if (process.env.NODE_ENV !== 'production') {
      logger.error('ErrorBoundary caught:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="error-boundary">Une erreur est survenue : {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 