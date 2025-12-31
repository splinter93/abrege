# 🔍 AUDIT LISTENERS CANVAS - DOUBLE ENREGISTREMENT

**Date** : 2025-01-XX  
**Problème** : Les listeners ne sont pas enregistrés correctement, "No listeners" côté serveur alors que l'UI montre "listener actif"  
**Symptôme** : EventSource connecté côté client, mais `streamBroadcastService` ne trouve pas de listeners

---

## 📊 ANALYSE DU PROBLÈME

### Code actuel (PROBLÉMATIQUE)

```typescript
// src/app/api/v2/canvas/[ref]/ops-listen/route.ts

// ❌ PROBLÈME 1: Enregistrement AVANT le stream (ligne 170)
console.error('🔍🔍🔍 [ops-listen] REGISTERING LISTENER BEFORE STREAM', { noteId, userId });
await streamBroadcastService.registerListener(noteId, sendSSE, userId);
// À ce moment, controller = null, isControllerReady = false
// sendSSE ne peut pas fonctionner car elle dépend de controller

const stream = new ReadableStream({
  async start(streamController) {
    controller = streamController;
    isControllerReady = true;
    
    // ❌ PROBLÈME 2: Enregistrement DANS le stream (ligne 226)
    await streamBroadcastService.registerListener(noteId, sendSSE, userId);
    // Cette fois controller est défini, mais c'est la MÊME fonction sendSSE
    // Le Set dans streamBroadcastService ne peut contenir qu'une instance
  }
});
```

### Problèmes identifiés

1. **Double enregistrement** : Le listener est enregistré 2 fois avec la même fonction `sendSSE`
2. **Timing incorrect** : Le premier enregistrement (ligne 170) se fait AVANT que `controller` soit défini
3. **Fonction non fonctionnelle** : `sendSSE` dépend de `controller` qui est `null` au premier enregistrement
4. **Set de listeners** : Un `Set` ne peut contenir qu'une seule instance d'une fonction, donc le deuxième enregistrement écrase le premier

### Pourquoi "No listeners" ?

Quand `broadcast()` est appelé :
- Le listener enregistré (ligne 170) ne peut pas fonctionner car `controller` est `null`
- Le listener enregistré (ligne 226) peut fonctionner, mais si le broadcast arrive AVANT que le stream démarre, il n'y a pas encore de listener fonctionnel

### Logs observés

```
🔍 [StreamBroadcast] broadcast called { noteId: '...', eventType: 'chunk' }
⚠️ [StreamBroadcast] No listeners { noteId: '...', eventType: 'chunk' }
```

Mais côté client :
```
✅ [ChatCanvaPane] EventSource opened { readyState: 1 }
```

---

## 🎯 SOLUTION

### Option 1 : Enregistrer UNIQUEMENT dans le callback start() (RECOMMANDÉ)

**Avantages** :
- ✅ Un seul enregistrement
- ✅ `controller` est défini quand le listener est enregistré
- ✅ Pas de race condition

**Implémentation** :
- Supprimer l'enregistrement ligne 170
- Garder uniquement l'enregistrement ligne 226 dans le callback `start()`

### Option 2 : Queue les événements jusqu'à ce que le listener soit prêt

**Avantages** :
- ✅ Pas de perte d'événements
- ✅ Fonctionne même si le broadcast arrive avant l'enregistrement

**Inconvénients** :
- ⚠️ Plus complexe
- ⚠️ Nécessite une queue avec limite de taille

---

## ✅ SOLUTION RECOMMANDÉE : Option 1

### Code corrigé

```typescript
// ❌ SUPPRIMER cet enregistrement (ligne 162-189)
// console.error('🔍🔍🔍 [ops-listen] REGISTERING LISTENER BEFORE STREAM', ...);
// await streamBroadcastService.registerListener(noteId, sendSSE, userId);

const stream = new ReadableStream({
  async start(streamController) {
    controller = streamController;
    isControllerReady = true;
    
    // ✅ ENREGISTRER LE LISTENER ICI UNIQUEMENT (après que controller soit défini)
    try {
      await streamBroadcastService.registerListener(noteId, sendSSE, userId);
      console.log('✅ [ops-listen] Listener registered successfully', { noteId, userId });
      logApi.info(`[ops-listen] ✅ Listener registered`, { noteId, userId });
    } catch (error) {
      // Gérer l'erreur
    }
    
    // Envoyer les événements en queue
    while (eventQueue.length > 0) {
      const queuedEvent = eventQueue.shift();
      if (queuedEvent) {
        sendSSE(queuedEvent);
      }
    }
  }
});
```

### Amélioration : Queue des événements

Pour éviter de perdre des événements qui arrivent avant l'enregistrement :

```typescript
// La queue existe déjà (ligne 120)
const eventQueue: StreamEvent[] = [];

// Dans sendSSE, si controller n'est pas prêt, mettre en queue
const sendSSE = (event: StreamEvent) => {
  if (isControllerClosed) return;
  
  if (!isControllerReady || !controller) {
    eventQueue.push(event); // ✅ Déjà implémenté
    return;
  }
  
  // Envoyer l'événement
  // ...
};

// Dans start(), après l'enregistrement, envoyer la queue
while (eventQueue.length > 0) {
  const queuedEvent = eventQueue.shift();
  if (queuedEvent) {
    sendSSE(queuedEvent);
  }
}
```

---

## 🔧 PLAN D'ACTION

1. ✅ Analyser le problème (FAIT)
2. ⏳ Supprimer l'enregistrement ligne 170
3. ⏳ Garder uniquement l'enregistrement ligne 226
4. ⏳ Vérifier que la queue fonctionne correctement
5. ⏳ Tester avec read_lints
6. ⏳ Documenter la solution

---

## 📝 NOTES

- Le problème est un **race condition** : le broadcast peut arriver avant que le listener soit enregistré
- La queue (`eventQueue`) existe déjà et devrait gérer ce cas, mais le double enregistrement peut causer des problèmes
- Vérifier que `unregisterListener` utilise bien la même référence de fonction pour supprimer le listener

