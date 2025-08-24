import TestLLMDeletePolling from '@/components/test/TestLLMDeletePolling';

export default function TestLLMDeletePollingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 Test du Polling des Suppressions LLM
          </h1>
          <p className="text-gray-600">
            Testez que les suppressions effectuées par le LLM sont bien visibles en temps réel dans l'interface.
          </p>
        </div>
        
        <TestLLMDeletePolling />
      </div>
    </div>
  );
} 