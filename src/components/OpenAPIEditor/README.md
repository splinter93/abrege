# Éditeur OpenAPI

Un éditeur visuel standalone pour créer et modifier des schémas OpenAPI.

## 🎯 Fonctionnalités

### 1. Chargement de schémas
- **JSON direct** : Collez votre schéma OpenAPI en JSON
- **URL** : Chargez un schéma depuis une URL publique
- **Fichier** : Uploadez un fichier JSON/YAML

### 2. Visualisation des endpoints
- **Cartes navigables** : Chaque endpoint affiché sous forme de carte
- **Informations détaillées** : Méthode, chemin, description, tags, paramètres
- **Codes couleur** : Méthodes HTTP avec couleurs distinctives

### 3. Édition visuelle
- **Suppression** : Supprimez des endpoints en un clic
- **Ajout** : Créez de nouveaux endpoints via formulaire
- **Modification** : Éditez les endpoints existants
- **Validation** : Validation en temps réel des données

### 4. Export
- **Copie** : Copiez le schéma en JSON dans le presse-papiers
- **Téléchargement** : Téléchargez le schéma en fichier JSON
- **Minification** : Option pour télécharger une version compacte

## 🚀 Utilisation

### Accès à l'éditeur
```
https://votre-domaine.com/openapi-editor
```

### Exemple de schéma
Un exemple de schéma OpenAPI est disponible à :
```
/public/example-openapi.json
```

## 🏗️ Architecture

### Structure des composants
```
src/components/OpenAPIEditor/
├── OpenAPIEditor.tsx          # Composant principal
├── SchemaInput.tsx            # Chargement de schémas
├── EndpointsList.tsx          # Liste des endpoints
├── EndpointForm.tsx           # Formulaire d'édition
├── ExportActions.tsx          # Actions d'export
├── OpenAPIEditorStyles.tsx    # Styles CSS
├── OpenAPITypes.ts            # Types TypeScript
├── index.ts                   # Exports
└── README.md                  # Documentation
```

### Types TypeScript
- `OpenAPISchema` : Structure complète du schéma OpenAPI
- `Endpoint` : Représentation d'un endpoint pour l'éditeur
- `EndpointFormData` : Données du formulaire d'édition
- `ExportOptions` : Options d'export

## 🎨 Design

### Style épuré
- **Thème sombre** : Interface moderne avec fond sombre
- **Couleurs cohérentes** : Palette basée sur les couleurs du projet
- **Typographie** : Noto Sans pour une lisibilité optimale
- **Espacement** : Marges et paddings harmonieux

### Responsive
- **Mobile-first** : Adaptation automatique aux petits écrans
- **Grille flexible** : Cartes qui s'adaptent à la largeur
- **Navigation tactile** : Boutons et interactions optimisés

## 🔧 Fonctionnalités techniques

### Parsing OpenAPI
- Support OpenAPI 3.0+
- Validation basique du schéma
- Gestion des erreurs de parsing

### État global
- Gestion d'état React avec hooks
- Persistance des modifications
- Validation en temps réel

### Export
- Génération JSON valide
- Support des formats minifiés
- Gestion des erreurs d'export

## 📝 Exemple d'utilisation

```typescript
import { OpenAPIEditor } from '@/components/OpenAPIEditor';

function MyPage() {
  const [schema, setSchema] = useState(null);
  
  return (
    <OpenAPIEditor
      schema={schema}
      onSchemaLoad={setSchema}
      onError={(error) => console.error(error)}
      onLoading={(loading) => setLoading(loading)}
      isLoading={false}
      error={null}
    />
  );
}
```

## 🚀 Déploiement

L'éditeur est complètement standalone et peut être déployé indépendamment :

1. **Page dédiée** : `/openapi-editor`
2. **Styles isolés** : CSS scoped à l'éditeur
3. **Composants modulaires** : Réutilisables et testables
4. **Types stricts** : TypeScript avec validation complète

## 🎯 Objectifs atteints

✅ **Page indépendante** : Complètement cloisonnée du reste de l'app  
✅ **Input flexible** : JSON, URL, fichier  
✅ **Parsing robuste** : Validation et gestion d'erreurs  
✅ **Visualisation claire** : Cartes navigables avec toutes les infos  
✅ **Édition complète** : Ajout, modification, suppression  
✅ **Export fonctionnel** : Copie + téléchargement  
✅ **UI moderne** : Design épuré type ChatGPT/Editor  
✅ **TypeScript strict** : Types précis et validation  
✅ **Code production-ready** : Robuste et maintenable  
