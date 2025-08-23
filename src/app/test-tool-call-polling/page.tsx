import TestToolCallPolling from '@/components/test/TestToolCallPolling';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function TestToolCallPollingPage() {
  return (
    <ErrorBoundary>
      <div className="test-tool-call-polling-page">
        <TestToolCallPolling />
      </div>
    </ErrorBoundary>
  );
} 