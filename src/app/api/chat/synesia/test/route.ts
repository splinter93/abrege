import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, messages } = await request.json();
    
    console.log("[Synesia Test API] 🚀 Début de la requête de test");
    console.log("[Synesia Test API] 📦 Body reçu:", { message, messages });

    // Simuler un délai de réponse
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Générer une réponse simulée basée sur le message
    let response = "";
    const lowerMessage = message.toLowerCase();
    
    // Salutations et conversations informelles
    if (lowerMessage.includes("bonjour") || lowerMessage.includes("hello") || lowerMessage.includes("salut") || lowerMessage.includes("slm")) {
      response = "Salut ! 👋 Je suis l'assistant IA de Scrivia. Comment ça va ? Je suis là pour t'aider avec tes projets !";
    } 
    // Questions sur l'état
    else if (lowerMessage.includes("ça va") || lowerMessage.includes("comment ça va") || lowerMessage.includes("comment allez-vous")) {
      response = "Ça va très bien, merci ! 😊 Je suis prêt à t'aider. Qu'est-ce que tu veux faire aujourd'hui ?";
    }
    // Demande d'aide
    else if (lowerMessage.includes("aide") || lowerMessage.includes("help") || lowerMessage.includes("aider")) {
      response = "Bien sûr ! Je peux t'aider avec plein de trucs cool :\n\n" +
        "📝 **Écriture** : Articles, emails, rapports, tout ça\n" +
        "📊 **Analyse** : Analyser des textes, extraire des infos importantes\n" +
        "📁 **Organisation** : T'organiser, structurer tes idées\n" +
        "🔍 **Recherche** : Trouver des infos sur des sujets\n" +
        "💡 **Brainstorming** : T'aider à développer tes idées\n\n" +
        "Dis-moi ce qui t'intéresse !";
    }
    // Merci
    else if (lowerMessage.includes("merci") || lowerMessage.includes("thanks")) {
      response = "De rien ! 😊 Je suis là pour ça. N'hésite pas si tu as d'autres questions !";
    }
    // Questions sur Scrivia
    else if (lowerMessage.includes("scrivia")) {
      response = "Scrivia c'est une plateforme géniale pour prendre des notes et s'organiser ! 🚀\n\n" +
        "Voici ce que tu peux faire avec :\n\n" +
        "📝 **Prendre des notes** avec un éditeur super riche\n" +
        "📁 **Organiser** tes docs en dossiers et classeurs\n" +
        "🔍 **Rechercher** super vite dans tes contenus\n" +
        "🤝 **Partager** tes notes avec d'autres\n" +
        "💬 **Discuter** avec moi (l'IA) pour améliorer tes contenus\n\n" +
        "C'est vraiment un outil puissant pour la productivité !";
    }
    // Questions sur l'IA
    else if (lowerMessage.includes("ia") || lowerMessage.includes("intelligence artificielle") || lowerMessage.includes("ai")) {
      response = "Oui, je suis une IA ! 🤖 Je peux t'aider avec plein de choses :\n\n" +
        "💬 **Conversation** : On peut discuter de tout\n" +
        "✍️ **Rédaction** : T'aider à écrire des textes\n" +
        "🧠 **Réflexion** : T'aider à organiser tes idées\n" +
        "📚 **Apprentissage** : T'expliquer des concepts\n" +
        "🎯 **Productivité** : T'aider à être plus efficace\n\n" +
        "Je suis là pour t'accompagner dans tes projets !";
    }
    // Questions sur les projets
    else if (lowerMessage.includes("projet") || lowerMessage.includes("travail") || lowerMessage.includes("boulot")) {
      response = "Super ! 🎯 Parlons de tes projets. Je peux t'aider avec :\n\n" +
        "📋 **Planification** : Organiser tes tâches et objectifs\n" +
        "📝 **Documentation** : Rédiger des documents professionnels\n" +
        "💡 **Idéation** : Développer tes idées et concepts\n" +
        "📊 **Analyse** : Analyser des données ou des textes\n" +
        "🎨 **Créativité** : T'aider à être plus créatif\n\n" +
        "Raconte-moi ce sur quoi tu travailles !";
    }
    // Réponses génériques mais plus personnalisées
    else {
      // Analyser le contexte de la conversation
      const messageCount = messages ? messages.length : 0;
      const isFirstMessage = messageCount === 0;
      
      if (isFirstMessage) {
        response = `Salut ! 👋 Merci pour ton message : "${message}"\n\n` +
          "Je suis l'assistant IA de Scrivia et je suis là pour t'aider ! Je peux t'assister dans plein de domaines : rédaction, analyse, organisation, recherche, et bien plus encore.\n\n" +
          "N'hésite pas à me poser des questions spécifiques ou à me demander de l'aide pour tes projets !";
      } else {
        response = `Intéressant ! 🤔 "${message}"\n\n` +
          "Je suis là pour t'aider. Tu peux me demander de l'aide pour :\n\n" +
          "📝 **Écrire** quelque chose\n" +
          "🔍 **Rechercher** des informations\n" +
          "📊 **Analyser** des données\n" +
          "💡 **Développer** tes idées\n" +
          "📋 **Organiser** tes projets\n\n" +
          "Dis-moi ce que tu veux faire !";
      }
    }

    // Ajouter des informations sur l'historique si disponible
    if (messages && messages.length > 0) {
      response += `\n\n*Note : Cette conversation contient ${messages.length} message(s) dans l'historique.*`;
    }

    console.log("[Synesia Test API] ✅ Réponse simulée générée");
    
    return NextResponse.json({ 
      success: true,
      response: response,
      test_mode: true,
      message_count: messages ? messages.length : 0
    });

  } catch (error) {
    console.error("[Synesia Test API] ❌ Erreur:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        test_mode: true
      },
      { status: 500 }
    );
  }
} 