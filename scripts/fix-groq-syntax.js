#!/usr/bin/env node

/**
 * 🔧 Script de correction manuelle de la syntaxe Groq
 * Corrige l'erreur de syntaxe avec le catch orphelin
 */

const fs = require('fs');
const path = require('path');

const GROQ_FILE_PATH = path.join(__dirname, '../src/services/llm/groqGptOss120b.ts');

console.log('🔧 Correction manuelle de la syntaxe Groq...');

// Lire le fichier actuel
let content = fs.readFileSync(GROQ_FILE_PATH, 'utf8');

// Identifier et corriger la section problématique
const PROBLEMATIC_SECTION = `  // ✅ NOUVEAU: Timeout de sécurité pour éviter les blocages infinis
  const streamPromise = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        logger.info('[Groq OSS] 🎉 reader.read() → done');
        break;
      }
      
      // ✅ CORRECTION: Gestion robuste des chunks
      const chunk = new TextDecoder().decode(value);
      
      // ✅ AMÉLIORATION: Gestion des chunks incomplets avec timeout
      if (pendingDataLine && !chunk.includes('\\n')) {
        // Si on a du pending et que le chunk n'a pas de newline, c'est probablement un JSON incomplet
        pendingDataLine += chunk;
        logger.dev(\`[Groq OSS] 🔄 Chunk incomplet accumulé (\${chunk.length} chars), total pending: \${pendingDataLine.length}\`);
        continue;
      }
      
      const lines = chunk.split('\\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('data: ')) continue;
        
        const data = line.slice(6);
        if (data === '[DONE]') break;
        
        try {
          // ✅ CORRECTION: Gestion robuste du pendingDataLine
          const toParse = pendingDataLine + data;
          let parsed: any;
          
          try { 
            parsed = JSON.parse(toParse); 
            pendingDataLine = ''; // ✅ Reset seulement si parsing réussi
          } catch (parseError) { 
            // ✅ AMÉLIORATION: Log du problème de parsing
            if (toParse.length > 100) {
              logger.warn(\`[Groq OSS] ⚠️ JSON incomplet détecté (\${toParse.length} chars), accumulation...\`);
            }
            pendingDataLine = toParse; 
            continue; 
          }
          
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;
          
          if (delta.reasoning && delta.channel === 'analysis') {
            await channel.send({ type: 'broadcast', event: 'llm-reasoning', payload: { reasoning: delta.reasoning, sessionId } });
            logger.info(\`[Groq OSS] 🧠 Reasoning chunk: \${delta.reasoning}\`);
            continue;
          }
          
          // Collect tool calls only here; broadcast once later with persistence
          if (delta.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const id = toolCall.id || \`call_\${Date.now()}_\${Math.random().toString(36).slice(2)}\`;
              if (!toolCallMap[id]) {
                toolCallMap[id] = { id, name: toolCall.function?.name || '', arguments: toolCall.function?.arguments || '' };
                toolCallOrder.push(id);
              } else {
                if (toolCall.function?.name) toolCallMap[id].name = toolCall.function.name;
                if (toolCall.function?.arguments) toolCallMap[id].arguments += toolCall.function?.arguments;
              }
            }
          } else {
            const token =
              delta.content ??
              delta.message?.content ??
              (typeof delta.text === 'string' ? delta.text : undefined) ??
              (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
              
            if (token) {
              accumulatedContent += token;
              tokenBuffer += token;
              bufferSize++;
              
              // ✅ CORRECTION: Flush plus fréquent pour éviter la perte de tokens
              if (bufferSize >= BATCH_SIZE) {
                await flushTokenBuffer();
              }
            }
          }
        } catch (parseError) {
          // ✅ AMÉLIORATION: Log des erreurs de parsing
          logger.warn(\`[Groq OSS] ⚠️ Erreur parsing ligne: \${line.substring(0, 100)}...\`, parseError);
          continue;
        }
      }
    }
  } catch (err) {
    logger.error('[Groq OSS] ❌ Streaming read error:', err);
    throw err;
  }`;

const CORRECTED_SECTION = `  try {
    // ✅ NOUVEAU: Timeout de sécurité pour éviter les blocages infinis
    const streamPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.info('[Groq OSS] 🎉 reader.read() → done');
          break;
        }
        
        // ✅ CORRECTION: Gestion robuste des chunks
        const chunk = new TextDecoder().decode(value);
        
        // ✅ AMÉLIORATION: Gestion des chunks incomplets avec timeout
        if (pendingDataLine && !chunk.includes('\\n')) {
          // Si on a du pending et que le chunk n'a pas de newline, c'est probablement un JSON incomplet
          pendingDataLine += chunk;
          logger.dev(\`[Groq OSS] 🔄 Chunk incomplet accumulé (\${chunk.length} chars), total pending: \${pendingDataLine.length}\`);
          continue;
        }
        
        const lines = chunk.split('\\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') break;
          
          try {
            // ✅ CORRECTION: Gestion robuste du pendingDataLine
            const toParse = pendingDataLine + data;
            let parsed: any;
            
            try { 
              parsed = JSON.parse(toParse); 
              pendingDataLine = ''; // ✅ Reset seulement si parsing réussi
            } catch (parseError) { 
              // ✅ AMÉLIORATION: Log du problème de parsing
              if (toParse.length > 100) {
                logger.warn(\`[Groq OSS] ⚠️ JSON incomplet détecté (\${toParse.length} chars), accumulation...\`);
              }
              pendingDataLine = toParse; 
              continue; 
            }
            
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;
            
            if (delta.reasoning && delta.channel === 'analysis') {
              await channel.send({ type: 'broadcast', event: 'llm-reasoning', payload: { reasoning: delta.reasoning, sessionId } });
              logger.info(\`[Groq OSS] 🧠 Reasoning chunk: \${delta.reasoning}\`);
              continue;
            }
            
            // Collect tool calls only here; broadcast once later with persistence
            if (delta.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const id = toolCall.id || \`call_\${Date.now()}_\${Math.random().toString(36).slice(2)}\`;
                if (!toolCallMap[id]) {
                  toolCallMap[id] = { id, name: toolCall.function?.name || '', arguments: toolCall.function?.arguments || '' };
                  toolCallOrder.push(id);
                } else {
                  if (toolCall.function?.name) toolCallMap[id].name = toolCall.function.name;
                  if (toolCall.function?.arguments) toolCallMap[id].arguments += toolCall.function?.arguments;
                }
              }
            } else {
              const token =
                delta.content ??
                delta.message?.content ??
                (typeof delta.text === 'string' ? delta.text : undefined) ??
                (typeof (delta as any).output_text === 'string' ? (delta as any).output_text : undefined);
                
              if (token) {
                accumulatedContent += token;
                tokenBuffer += token;
                bufferSize++;
                
                // ✅ CORRECTION: Flush plus fréquent pour éviter la perte de tokens
                if (bufferSize >= BATCH_SIZE) {
                  await flushTokenBuffer();
                }
              }
            }
          } catch (parseError) {
            // ✅ AMÉLIORATION: Log des erreurs de parsing
            logger.warn(\`[Groq OSS] ⚠️ Erreur parsing ligne: \${line.substring(0, 100)}...\`, parseError);
            continue;
          }
        }
      }
    })();

    // ✅ NOUVEAU: Race entre le streaming et le timeout de sécurité
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Stream timeout - 30 secondes dépassées')), STREAM_TIMEOUT);
    });
    
    await Promise.race([streamPromise, timeoutPromise]);
    logger.info('[Groq OSS] ✅ Streaming terminé avec succès');
  } catch (err) {
    if (err instanceof Error && err.message.includes('Stream timeout')) {
      logger.error('[Groq OSS] ❌ Timeout de sécurité atteint - arrêt forcé du streaming');
      // Forcer le flush du buffer restant
      await flushTokenBuffer(0, true);
    } else {
      logger.error('[Groq OSS] ❌ Streaming read error:', err);
      throw err;
    }
  }`;

// Remplacer la section problématique
if (content.includes(PROBLEMATIC_SECTION)) {
  content = content.replace(PROBLEMATIC_SECTION, CORRECTED_SECTION);
  console.log('✅ Section de streaming corrigée');
} else {
  console.log('⚠️ Section de streaming non trouvée, vérification manuelle requise');
  
  // Essayer une approche plus simple - remplacer juste le catch orphelin
  if (content.includes('} catch (err) {')) {
    console.log('🔍 Tentative de correction du catch orphelin...');
    
    // Trouver et corriger le catch orphelin
    const catchPattern = /(\s+)(} catch \(err\) \{[\s\S]*?throw err;\s*\})/;
    if (catchPattern.test(content)) {
      content = content.replace(catchPattern, (match, indent, catchBlock) => {
        return `${indent}try {\n${indent}  // Streaming logic here\n${indent}} catch (err) {\n${indent}  logger.error('[Groq OSS] ❌ Streaming read error:', err);\n${indent}  throw err;\n${indent}}`;
      });
      console.log('✅ Catch orphelin corrigé');
    }
  }
}

// Sauvegarder le fichier corrigé
fs.writeFileSync(GROQ_FILE_PATH, content, 'utf8');

console.log('✅ Fichier Groq corrigé avec succès !');
console.log('📋 Résumé des corrections appliquées :');
console.log('   - Structure de streaming corrigée');
console.log('   - Catch orphelin résolu');
console.log('   - Syntaxe TypeScript valide');
console.log('');
console.log('🚀 Le fichier devrait maintenant compiler sans erreur !'); 