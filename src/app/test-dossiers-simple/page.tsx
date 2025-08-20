"use client";

import { useState, useEffect } from "react";
import { optimizedClasseurService } from "@/services/optimizedClasseurService";
import { useFileSystemStore } from "@/store/useFileSystemStore";

export default function TestDossiersSimple() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [userId, setUserId] = useState("3223651c-5580-4471-affb-b3f4456bd729"); // ID de test
  
  const classeurs = useFileSystemStore((state) => state.classeurs);
  const folders = useFileSystemStore((state) => state.folders);
  const notes = useFileSystemStore((state) => state.notes);

  const testLoadClasseurs = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log("🚀 Test chargement classeurs pour userId:", userId);
      
      const startTime = Date.now();
      const data = await optimizedClasseurService.loadClasseursWithContentOptimized(userId);
      const totalTime = Date.now() - startTime;
      
      setResult({
        success: true,
        data,
        totalTime,
        storeState: {
          classeurs: Object.keys(classeurs).length,
          folders: Object.keys(folders).length,
          notes: Object.keys(notes).length
        }
      });
      
      console.log("✅ Succès:", { data, totalTime });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error("❌ Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const testCacheStats = () => {
    const stats = optimizedClasseurService.getCacheStats();
    console.log("📊 Cache stats:", stats);
    setResult(prev => ({ ...prev, cacheStats: stats }));
  };

  const testHealthCheck = async () => {
    try {
      const health = await optimizedClasseurService.healthCheck();
      console.log("🏥 Health check:", health);
      setResult(prev => ({ ...prev, health }));
    } catch (err) {
      console.error("❌ Health check failed:", err);
    }
  };

  const clearCache = () => {
    optimizedClasseurService.clearAllCache();
    console.log("🗑️ Cache vidé");
    testCacheStats();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Dossiers Simple</h1>
      
      {/* Contrôles */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">User ID:</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Entrez un user ID"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={testLoadClasseurs}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? "🔄 Chargement..." : "🚀 Charger Classeurs"}
          </button>
          
          <button
            onClick={testCacheStats}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            📊 Cache Stats
          </button>
          
          <button
            onClick={testHealthCheck}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            🏥 Health Check
          </button>
          
          <button
            onClick={clearCache}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            🗑️ Vider Cache
          </button>
        </div>
      </div>

      {/* État du Store */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">📦 État du Store</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{Object.keys(classeurs).length}</div>
            <div className="text-sm text-blue-800">Classeurs</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{Object.keys(folders).length}</div>
            <div className="text-sm text-green-800">Dossiers</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(notes).length}</div>
            <div className="text-sm text-purple-800">Notes</div>
          </div>
        </div>
      </div>

      {/* Résultats */}
      {result && (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">📋 Résultats</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">❌ Erreur</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Détails des classeurs */}
      {Object.keys(classeurs).length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-3">📚 Classeurs Chargés</h2>
          <div className="space-y-2">
            {Object.entries(classeurs).map(([id, classeur]) => (
              <div key={id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                <span className="text-2xl">{classeur.emoji || '📚'}</span>
                <div>
                  <div className="font-medium">{classeur.name}</div>
                  <div className="text-sm text-gray-600">ID: {id.substring(0, 8)}...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 