# NOCTYS Creative Hub

Application de production social media pour TEAM NOCTYS : création de templates, rédaction, concepts assistés par IA, bibliothèque de créations et calendrier éditorial.

## Fonctionnalités

- Templates Instagram, X, TikTok et Facebook avec sauvegarde automatique
- Éditeur de textes avec aperçu social et limites par réseau
- Générateurs de concepts logo, image et texte (mode démo, interfaces ChatGPT/Gemini prêtes à connecter)
- Bibliothèque « Mes créations » filtrable
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

La base locale est créée automatiquement au premier appel à `/api/workspace`. Le schéma Drizzle se trouve dans `db/schema.ts` et la migration initiale dans `drizzle/0000_noctys_workspace.sql`.

