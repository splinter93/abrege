import TestClasseurPolling from '@/components/test/TestClasseurPolling';

export default function TestClasseurPollingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test du Polling des Classeurs
          </h1>
          <p className="text-gray-600">
            Testez en temps réel la suppression des classeurs avec le nouveau système de polling intelligent.
          </p>
        </div>
        
        <TestClasseurPolling />
      </div>
    </div>
  );
} 