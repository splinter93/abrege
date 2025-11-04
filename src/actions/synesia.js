import axios from 'axios';
import { optimizedApi } from '../services/optimizedApi';

const SYNESIA_API_URL = 'https://api.synesia.app/webhooks/a416f2c7-3ebd-4bc7-8979-70f7e1ad572f?wait=true';

/**
 * Sends a flexible payload to the Synesia Webhook.
 * @param {object} customPayload - The custom JSON payload to send as arguments.
 * @returns {Promise<any>} The response data from the API.
 */
export const sendPayloadToSynesia = async ({ url, type, classeurId }) => {
  if (!classeurId) {
    throw new Error("Impossible d'envoyer à Synesia sans ID de classeur.");
  }
  
  try {
    // Crée immédiatement un article "en attente" avec le bon classeurId
    const newArticle = await optimizedApi.createNote({
      source_type: type,
      source_url: url,
      source_title: `Résumé en cours pour : ${url}`,
      status: 'loading',
      classeur_id: classeurId,
    });

    logger.dev('[Synesia] Article créé en BDD, en attente du résumé:', newArticle.note);
    
    // Vous pouvez ici ajouter la logique pour appeler un service externe (Synesia)
    // en lui passant le `newArticle.id` pour qu'il puisse mettre à jour l'article plus tard.
    // Pour l'instant, nous confirmons que la création initiale fonctionne.
    // Exemple d'appel futur :
    // await externalSynesiaService.process({ articleId: newArticle.id, url, type });

    return newArticle.note;

  } catch (error) {
    console.error("Erreur lors de la création de l'article avant l'envoi à Synesia :", error);
    throw error;
  }
};

export const sendTextToSynesia = async (text) => {
  const payload = {
    apiKey: SYNESIA_API_KEY,
    text: text,
  };

  const response = await axios.post(SYNESIA_API_URL, payload);
  return response.data;
}; 