# NOCTYS Creative Hub

Application de production social media pour TEAM NOCTYS : création de templates, rédaction, concepts assistés par IA, bibliothèque de créations et calendrier éditorial.

## Fonctionnalités

- Créateur de templates préremplis ou vierges, avec formats Instagram, X, TikTok et Facebook et dimensions personnalisées
- Éditeur graphique Sketchup sur canvas : texte, formes, images, calques, déplacement, duplication, annulation et sauvegarde
- Import direct de templates PNG, JPG, WebP ou manifeste NOCTYS JSON, stockés dans R2
- Éditeur de textes avec aperçu social et limites par réseau
- Génération réelle de textes, logos et images avec OpenAI ou Gemini lorsque la clé serveur correspondante est configurée
- Repli automatique sur un mode démo explicite lorsqu’aucune clé n’est présente
- Bibliothèque « Mes créations » filtrable, avec modification dans Sketchup et suppression confirmée
- Sélection multiple et export local en PDF ou archive ZIP (visuels PNG, textes et manifeste)
- Calendrier éditorial et création de tâches
- Statuts Débuté / En cours / Finie et priorité calculée depuis la veille de publication
- Ajout direct des publications dans Google Agenda
- Persistance D1 et publication exemple NOCTYS vs ORION

## Développement

Prérequis : Node.js 22.13+ et pnpm.

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

La base locale est créée automatiquement au premier appel à `/api/workspace`. Le schéma Drizzle se trouve dans `db/schema.ts` et les migrations dans `drizzle/`.

Un manifeste d’import prêt à tester est fourni dans `examples/template-import-match-night.json`. Les images peuvent être déposées directement dans la zone d’import du Studio.

## Génération assistée

Copiez `.env.example` vers `.env.local` pour le développement, puis renseignez au moins `OPENAI_API_KEY` ou `GEMINI_API_KEY`. En production, configurez ces valeurs comme secrets dans l’hébergeur — jamais dans le code ni dans le navigateur. Les modèles peuvent être remplacés avec les variables optionnelles listées dans `.env.example`.

La route `/api/integrations` expose uniquement l’état de connexion et les noms de modèles, jamais les secrets. Les images générées et les templates importés utilisent le binding R2 `TEMPLATE_ASSETS`; les tâches et métadonnées restent dans le binding D1 `DB`.
