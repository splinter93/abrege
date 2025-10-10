import { NextResponse } from 'next/server';
import { ToolCallManager } from '@/services/llm/toolCallManager';

/**
 * 📊 API de statistiques des tool calls
 * Endpoint de debugging pour monitorer les duplications
 */
export async function GET() {
  try {
    const toolCallManager = ToolCallManager.getInstance();
    const stats = toolCallManager.getDuplicationStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * 🔄 Reset des statistiques (pour les tests)
 */
export async function DELETE() {
  try {
    const toolCallManager = ToolCallManager.getInstance();
    toolCallManager.clearExecutionHistory();
    
    return NextResponse.json({
      success: true,
      message: 'Statistiques réinitialisées',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

