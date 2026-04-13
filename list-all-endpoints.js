#!/usr/bin/env node

/**
 * Script pour lister tous les endpoints disponibles
 * Documentation complète de l'API v2 avec agents spécialisés
 */

console.log('📋 LISTE COMPLÈTE DES ENDPOINTS API V2 - AGENTS SPÉCIALISÉS\n');

console.log('🔗 ENDPOINTS PRINCIPAUX\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│                    /api/v2/agents/{agentId}                     │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ GET    │ Récupérer les informations d\'un agent spécialisé      │');
console.log('│ POST   │ Exécuter un agent spécialisé                          │');
console.log('│ PUT    │ Mise à jour complète d\'un agent spécialisé            │');
console.log('│ PATCH  │ Mise à jour partielle d\'un agent spécialisé           │');
console.log('│ DELETE │ Supprimer un agent spécialisé (soft delete)           │');
console.log('│ HEAD   │ Vérifier l\'existence d\'un agent spécialisé           │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🔗 ENDPOINTS DE CONTENU\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ POST /api/v2/note/{ref}/content:apply                          │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ 🆕 NOUVEAU │ Appliquer des opérations de contenu LLM-friendly  │');
console.log('│            │ insert, replace, delete, upsert_section           │');
console.log('│            │ Cibles: heading, regex, position, anchor          │');
console.log('│            │ Dry-run par défaut, ETag validation               │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ POST /api/v2/note/{ref}/sections:edit                          │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ TOC-first │ Édition par slug (getNoteTOC) : insert, replace…   │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🔗 ENDPOINTS DE GESTION\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ GET  /api/v2/agents                    │ Liste tous les agents  │');
console.log('│ GET  /api/v2/openapi-schema            │ Documentation OpenAPI  │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🔗 ENDPOINT UNIVERSEL AGENTS\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ POST /api/v2/agents/execute                                   │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ 🆕 NOUVEAU │ Exécuter n\'importe quel agent universellement    │');
console.log('│            │ ref: ID ou slug de l\'agent                       │');
console.log('│            │ input: Message pour l\'agent                      │');
console.log('│            │ options: temperature, max_tokens, stream          │');
console.log('│            │ Parfait pour tests et développement LLM           │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🔗 ENDPOINTS COMPLETS API V2\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ 📝 NOTES                                                       │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ GET    /api/v2/note/{ref}              │ Récupérer une note     │');
console.log('│ POST   /api/v2/note/create             │ Créer une note         │');
console.log('│ PUT    /api/v2/note/{ref}/update       │ Mettre à jour          │');
console.log('│ GET    /api/v2/note/recent             │ Notes récentes         │');
console.log('│ POST   /api/v2/note/{ref}/insert-content │ Insérer contenu      │');
console.log('│ POST   /api/v2/note/{ref}/content:apply │ 🆕 Opérations contenu │');
console.log('│ POST   /api/v2/note/{ref}/sections:edit │ Édition TOC (slug)   │');
console.log('│ GET    /api/v2/note/{ref}/table-of-contents │ Table matières    │');
console.log('│ POST   /api/v2/note/{ref}/share        │ Partager               │');
console.log('│ POST   /api/v2/note/{ref}/move         │ Déplacer               │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ 📁 DOSSIERS                                                   │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ GET    /api/v2/folder/{ref}            │ Récupérer dossier      │');
console.log('│ POST   /api/v2/folder/create           │ Créer dossier          │');
console.log('│ PUT    /api/v2/folder/{ref}/update     │ Mettre à jour          │');
console.log('│ GET    /api/v2/folder/{ref}/tree       │ Arbre du dossier       │');
console.log('│ POST   /api/v2/folder/{ref}/move       │ Déplacer               │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ 📚 CLASSEURS                                                  │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ GET    /api/v2/classeurs               │ Liste classeurs        │');
console.log('│ GET    /api/v2/classeurs/with-content  │ Avec contenu           │');
console.log('│ POST   /api/v2/classeur/create         │ Créer classeur         │');
console.log('│ GET    /api/v2/classeur/{ref}          │ Récupérer classeur     │');
console.log('│ PUT    /api/v2/classeur/{ref}/update   │ Mettre à jour          │');
console.log('│ GET    /api/v2/classeur/{ref}/tree     │ Arbre du classeur      │');
console.log('│ POST   /api/v2/classeur/reorder        │ Réorganiser            │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ 🔍 RECHERCHE & UTILITAIRES                                     │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ GET    /api/v2/search                  │ Recherche contenu      │');
console.log('│ GET    /api/v2/me                      │ Profil utilisateur     │');
console.log('│ GET    /api/v2/stats                   │ Statistiques           │');
console.log('│ GET    /api/v2/tools                   │ Outils disponibles     │');
console.log('│ GET    /api/v2/files/search            │ Recherche fichiers     │');
console.log('│ DELETE /api/v2/delete/{resource}/{ref} │ Suppression unifiée    │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ 🗑️ CORBEILLE                                                   │');
console.log('├─────────────────────────────────────────────────────────────────┤');
console.log('│ GET    /api/v2/trash                   │ Contenu corbeille      │');
console.log('│ POST   /api/v2/trash/restore           │ Restaurer élément      │');
console.log('│ POST   /api/v2/trash/purge             │ Vider corbeille        │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🔗 ENDPOINTS UI\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ GET  /api/ui/agents?specialized=true   │ Liste agents spécialisés│');
console.log('│ POST /api/ui/agents                    │ Créer un agent         │');
console.log('│ GET  /api/ui/agents/specialized        │ Liste agents spécialisés│');
console.log('│ POST /api/ui/agents/specialized        │ Créer agent spécialisé │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🤖 AGENTS PRÉ-CONFIGURÉS\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ johnny     │ Johnny Query - Analyse de notes et d\'images       │');
console.log('│ formatter  │ Formateur - Mise en forme de documents            │');
console.log('│ vision     │ Vision - Analyse d\'images complexes               │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('📝 EXEMPLES D\'UTILISATION\n');

console.log('1️⃣ 🆕 Exécuter un agent universel:');
console.log('   POST /api/v2/agents/execute');
console.log('   {');
console.log('     "ref": "johnny",');
console.log('     "input": "Analyse cette note et donne-moi un résumé",');
console.log('     "options": {');
console.log('       "temperature": 0.7,');
console.log('       "max_tokens": 500');
console.log('     }');
console.log('   }');
console.log('');

console.log('2️⃣ 🆕 Appliquer des opérations de contenu:');
console.log('   POST /api/v2/note/my-note/content:apply');
console.log('   {');
console.log('     "ops": [{');
console.log('       "id": "op-1",');
console.log('       "action": "insert",');
console.log('       "target": {');
console.log('         "type": "heading",');
console.log('         "heading": {');
console.log('           "path": ["API", "Endpoints"],');
console.log('           "level": 3');
console.log('         }');
console.log('       },');
console.log('       "where": "after",');
console.log('       "content": "### Nouveau bloc\\nContenu..."');
console.log('     }],');
console.log('     "dry_run": true,');
console.log('     "return": "diff"');
console.log('   }');
console.log('');

console.log('3️⃣ Exécuter l\'agent Johnny (endpoint spécifique):');
console.log('   POST /api/v2/agents/johnny');
console.log('   {');
console.log('     "input": {');
console.log('       "noteId": "note-123",');
console.log('       "query": "Analyse cette note",');
console.log('       "imageUrl": "https://example.com/image.jpg"');
console.log('     }');
console.log('   }');
console.log('');

console.log('2️⃣ Mettre à jour un agent:');
console.log('   PUT /api/v2/agents/johnny');
console.log('   {');
console.log('     "display_name": "Johnny Query Updated",');
console.log('     "description": "Nouvelle description",');
console.log('     "temperature": 0.8');
console.log('   }');
console.log('');

console.log('3️⃣ Mise à jour partielle:');
console.log('   PATCH /api/v2/agents/johnny');
console.log('   {');
console.log('     "temperature": 0.5');
console.log('   }');
console.log('');

console.log('4️⃣ Créer un nouvel agent:');
console.log('   POST /api/ui/agents/specialized');
console.log('   {');
console.log('     "slug": "mon-agent",');
console.log('     "display_name": "Mon Agent",');
console.log('     "description": "Description de l\'agent",');
console.log('     "model": "meta-llama/llama-4-scout-17b-16e-instruct",');
console.log('     "system_instructions": "Tu es un assistant...",');
console.log('     "input_schema": { "type": "object", "properties": {...} },');
console.log('     "output_schema": { "type": "object", "properties": {...} }');
console.log('   }');
console.log('');

console.log('🔧 MODÈLES SUPPORTÉS\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ meta-llama/llama-4-scout-17b-16e-instruct    │ Multimodal 16e  │');
console.log('│ meta-llama/llama-4-maverick-17b-128e-instruct │ Multimodal 128e │');
console.log('│ groq-llama3-8b-8192                          │ Texte uniquement│');
console.log('│ groq-llama3-70b-8192                          │ Texte uniquement│');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🔐 AUTHENTIFICATION\n');
console.log('Tous les endpoints nécessitent une authentification via:');
console.log('- Header Authorization: Bearer <token>');
console.log('- Ou cookie de session valide');
console.log('');

console.log('📊 CODES DE RÉPONSE\n');
console.log('┌─────────────────────────────────────────────────────────────────┐');
console.log('│ 200 │ Succès                                                  │');
console.log('│ 201 │ Créé avec succès                                        │');
console.log('│ 400 │ Données invalides                                       │');
console.log('│ 401 │ Authentification requise                                │');
console.log('│ 404 │ Agent non trouvé                                        │');
console.log('│ 500 │ Erreur interne du serveur                               │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('🎯 FONCTIONNALITÉS CLÉS\n');
console.log('✅ Support multimodale (texte + images)');
console.log('✅ Validation stricte des schémas JSON');
console.log('✅ Cache intelligent avec invalidation');
console.log('✅ Logs détaillés et traçabilité');
console.log('✅ Documentation OpenAPI dynamique');
console.log('✅ Types TypeScript stricts');
console.log('✅ Gestion d\'erreurs robuste');
console.log('✅ Soft delete pour la sécurité');
console.log('✅ 🆕 Content Apply LLM-friendly');
console.log('✅ 🆕 Opérations de contenu précises');
console.log('✅ 🆕 Dry-run par défaut');
console.log('✅ 🆕 ETag validation');
console.log('');

console.log('🚀 PRÊT POUR LA PRODUCTION !');
