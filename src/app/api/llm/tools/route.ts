import { NextRequest, NextResponse } from 'next/server';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';

export async function GET(request: NextRequest) {
  try {
    console.log('[LLM Tools] 🔍 Récupération des tools disponibles');
    
    // ✅ Attendre que l'initialisation soit complète
    await agentApiV2Tools.waitForInitialization();
    
    // ✅ Récupérer tous les tools disponibles
    const tools = agentApiV2Tools.getToolsForFunctionCalling();
    console.log('[LLM Tools] 📊 Tools récupérés:', { count: tools.length });
    
    // ✅ Récupérer les informations de debug
    const debugInfo = agentApiV2Tools.getOpenAPIDebugInfo();
    console.log('[LLM Tools] 📊 Debug info:', debugInfo);
    
    // ✅ Récupérer la liste des tools par nom
    const availableTools = agentApiV2Tools.getAvailableTools();
    console.log('[LLM Tools] 📊 Tools disponibles:', availableTools);
    
    const response = {
      timestamp: new Date().toISOString(),
      totalTools: tools.length,
      availableTools,
      tools: tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      })),
      debug: debugInfo
    };
    
    console.log('[LLM Tools] ✅ Tools récupérés:', {
      totalTools: tools.length,
      availableTools: availableTools.length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[LLM Tools] ❌ Erreur lors de la récupération des tools:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tools', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 