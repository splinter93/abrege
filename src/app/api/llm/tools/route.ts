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
    
    // ✅ Créer une documentation claire avec exemples
    const toolsWithExamples = tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
      example: generateExampleForTool(tool.function.name, tool.function.parameters)
    }));
    
    const response = {
      timestamp: new Date().toISOString(),
      totalTools: tools.length,
      availableTools,
      tools: toolsWithExamples,
      debug: debugInfo,
      documentation: {
        note: "ATTENTION: Utiliser EXACTEMENT les noms de paramètres indiqués dans chaque tool. Les exemples montrent le format JSON attendu.",
        commonErrors: [
          "Erreur: 'notebookId' au lieu de 'notebook_id'",
          "Erreur: 'noteId' au lieu de 'ref'", 
          "Erreur: 'title' au lieu de 'source_title'",
          "Erreur: 'content' au lieu de 'markdown_content'"
        ]
      }
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

// Fonction pour générer des exemples clairs pour chaque tool
function generateExampleForTool(toolName: string, parameters: any): any {
  const examples: Record<string, any> = {
    'create_note': {
      source_title: "Ma nouvelle note",
      notebook_id: "d35d755e-42a4-4100-b796-9c614b2b13bd",
      markdown_content: "# Contenu de la note\n\nVoici le contenu...",
      folder_id: "optional-folder-id"
    },
    'update_note': {
      ref: "note-id-or-slug",
      source_title: "Nouveau titre",
      markdown_content: "# Contenu mis à jour"
    },
    'add_content_to_note': {
      ref: "note-id-or-slug",
      content: "Nouveau contenu à ajouter"
    },
    'get_tree': {
      notebook_id: "d35d755e-42a4-4100-b796-9c614b2b13bd"
    },
    'create_folder': {
      name: "Mon nouveau dossier",
      notebook_id: "d35d755e-42a4-4100-b796-9c614b2b13bd",
      parent_id: "optional-parent-folder-id"
    },
    'get_note_content': {
      ref: "note-id-or-slug"
    },
    'delete_note': {
      ref: "note-id-or-slug"
    },
    'move_note': {
      ref: "note-id-or-slug",
      target_notebook_id: "new-notebook-id",
      target_folder_id: "optional-target-folder-id"
    }
  };
  
  return examples[toolName] || { note: "Voir les paramètres requis ci-dessus" };
} 