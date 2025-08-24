import TestNotesFoldersPolling from '@/components/test/TestNotesFoldersPolling';

export default function TestNotesFoldersPollingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test du Polling des Notes et Dossiers
          </h1>
          <p className="text-gray-600">
            Testez en temps réel la suppression des notes et dossiers avec le nouveau système de polling intelligent.
          </p>
        </div>
        
        <TestNotesFoldersPolling />
      </div>
    </div>
  );
} 