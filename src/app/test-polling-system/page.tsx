import TestPollingSystem from '@/components/test/TestPollingSystem';

export default function TestPollingSystemPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test du Système de Polling de Suppression
          </h1>
          <p className="text-gray-600">
            Testez en temps réel la suppression des notes, dossiers et classeurs avec le nouveau système de polling intelligent.
          </p>
        </div>
        
        <TestPollingSystem />
      </div>
    </div>
  );
} 