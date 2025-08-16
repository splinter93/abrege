# 🎤 Guide d'utilisation de la Dictée Vocale dans l'Éditeur

## 📋 Vue d'ensemble

La dictée vocale est maintenant intégrée dans l'éditeur de notes Scrivia ! Vous pouvez dicter du texte directement dans vos notes en utilisant votre microphone.

## 🚀 Comment utiliser la dictée vocale

### **Étape 1 : Ouvrir une note**
- Ouvrez une note existante ou créez-en une nouvelle
- Assurez-vous que l'éditeur est en mode édition (pas en lecture seule)

### **Étape 2 : Placer le curseur**
- Cliquez dans l'éditeur à l'endroit où vous voulez insérer le texte dicté
- Le curseur doit être visible et clignotant

### **Étape 3 : Démarrer l'enregistrement**
- Cliquez sur le bouton **🎤 microphone** dans la toolbar de l'éditeur
- Le bouton devient rouge et commence à pulser (état d'enregistrement)

### **Étape 4 : Dicter le texte**
- Parlez clairement dans votre microphone
- Le texte sera transcrit en temps réel via l'API Whisper

### **Étape 5 : Arrêter l'enregistrement**
- Cliquez à nouveau sur le bouton microphone pour arrêter
- Le bouton devient bleu pendant le traitement (état de traitement)

### **Étape 6 : Vérifier le résultat**
- Le texte transcrit s'insère automatiquement à la position du curseur
- Le curseur se place après le texte inséré
- Vous pouvez maintenant éditer ou continuer à dicter

## 🎯 Fonctionnalités clés

### **Insertion intelligente**
- Le texte est inséré exactement où vous avez placé votre curseur
- Les espaces sont ajoutés automatiquement si nécessaire
- Le focus reste sur l'éditeur après l'insertion

### **États visuels**
- **Normal** : Bouton gris avec icône microphone
- **Enregistrement** : Bouton rouge avec animation pulse
- **Traitement** : Bouton bleu avec spinner

### **Gestion des erreurs**
- Messages d'erreur clairs en cas de problème
- Logs détaillés dans la console pour le débogage
- Gestion gracieuse des erreurs de microphone

## 🔧 Configuration requise

### **Navigateur**
- Chrome, Firefox, Safari, Edge (versions récentes)
- Support de l'API MediaRecorder
- Support de getUserMedia pour l'accès au microphone

### **Microphone**
- Microphone fonctionnel connecté à votre ordinateur
- Permissions accordées au navigateur
- Qualité audio suffisante pour la reconnaissance vocale

### **Connexion internet**
- Connexion stable pour l'API Whisper
- Latence faible pour une expérience fluide

## 🚨 Dépannage

### **Le bouton microphone ne répond pas**
- Vérifiez que l'éditeur est en mode édition
- Rechargez la page si nécessaire
- Vérifiez les erreurs dans la console du navigateur

### **Pas d'accès au microphone**
- Vérifiez les permissions du navigateur
- Cliquez sur l'icône de cadenas dans la barre d'adresse
- Autorisez l'accès au microphone

### **Erreur de transcription**
- Vérifiez votre connexion internet
- Parlez plus clairement et plus lentement
- Vérifiez que votre microphone fonctionne

### **Texte mal transcrit**
- Parlez plus clairement
- Évitez les bruits de fond
- Utilisez un microphone de meilleure qualité

## 🌟 Conseils pour une meilleure dictée

### **Qualité audio**
- Utilisez un microphone de bonne qualité
- Évitez les bruits de fond
- Parlez à une distance constante du microphone

### **Technique de dictée**
- Parlez clairement et à un rythme modéré
- Faites des pauses entre les phrases
- Évitez les mots techniques complexes

### **Édition post-dictée**
- Relisez toujours le texte transcrit
- Corrigez les erreurs de reconnaissance
- Utilisez la dictée pour le brouillon, l'édition manuelle pour la finition

## 🔗 Ressources utiles

- **Page de test** : `/test-editor-dictation`
- **API Whisper** : `/api/v2/whisper/transcribe`
- **Documentation technique** : Voir le code source des composants

## 📝 Notes techniques

- Utilise l'API Whisper v2 de Groq pour la transcription
- Support des langues : français, anglais, et autres langues supportées par Whisper
- Format audio : WebM avec codec Opus
- Taille maximale des fichiers : selon la configuration de l'API

---

**Version** : 1.0  
**Date** : 2025-01-16  
**Auteur** : Équipe Scrivia 