import TestDeleteDebug from '@/components/test/TestDeleteDebug';

export default function TestDeleteDebugPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🐛 Debug des Suppressions
          </h1>
          <p className="text-gray-600">
            Diagnostic complet pour identifier pourquoi les suppressions ne sont pas visibles en temps réel.
          </p>
        </div>
        
        <TestDeleteDebug />
      </div>
    </div>
  );
} 