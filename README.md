# Medina — Frontend Vue 3 du restaurant

Projet frontend prêt à lancer pour **admin, cuisinier/comptoir et caissier**. Vue 3, TypeScript, Vite, Pinia, Vue Router, Axios, vue-i18n, Socket.IO, Lucide et thème Medina Blue fourni.

## 1. Installer et démarrer sur Windows

Vous avez déjà installé Node/npm ? Vérifiez simplement leurs versions dans PowerShell :

```powershell
node -v
npm.cmd -v
```

Sinon installez **Node.js 24 LTS** depuis https://nodejs.org/ puis redémarrez VS Code et vos terminaux. npm est inclus. Node 22.12+ fonctionne aussi. Pas besoin de Vue CLI, fnm ou d'une installation globale de Vue.

1. Téléchargez le ZIP depuis le bouton « Télécharger le projet ZIP » de la page du projet.
2. Dans l’Explorateur Windows, clic droit sur le ZIP → **Extraire tout**.
3. Ouvrez le dossier extrait **qr-restaurant-frontend** dans VS Code. Le bon dossier contient `package.json`, `src` et ce README.
4. Dans VS Code : Terminal → Nouveau terminal. N’exécutez pas les commandes dans `C:\Users\USER` : le terminal doit être dans le dossier du projet.
5. Lancez :

```powershell
npm.cmd ci
npm.cmd run dev
```

6. Ouvrez l’adresse indiquée par Vite, habituellement **http://localhost:5173**. Laissez le terminal ouvert. Pour arrêter : Ctrl+C. Les prochaines fois : `npm.cmd run dev` suffit.

Extension VS Code recommandée : **Vue - Official** (éditeur Vue). Désactivez Vetur dans ce projet s’il est déjà installé.

Le premier lancement ne nécessite ni `.env`, ni backend, ni MongoDB : **le mode démo est activé par défaut**.

**Raccourci Windows :** après extraction, double-cliquez sur `START_WINDOWS.bat`. Il ouvre le bon dossier, installe les dépendances si nécessaire et lance Vite. Gardez cette fenêtre ouverte et ouvrez l’adresse Local affichée. Node doit déjà être installé.

## 2. Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
| --- | --- | --- |
| admin | demo1234 | ADMIN |
| cuisinier | demo1234 | CONTOIRISTE |
| caissier | demo1234 | CAISSIER |

Cliquez sur un compte puis « Se connecter ». Déconnectez-vous pour changer de rôle.

Les données sont stockées dans **ce navigateur**. Pour réinitialiser, connectez-vous en admin → Vue d’ensemble → Réinitialiser la démo. Elles ne sont pas partagées entre appareils. Les onglets du même navigateur se synchronisent par événements et actualisation périodique. Le mot de passe de tous les comptes démo, même ceux créés dans l’interface, reste `demo1234` ; la démo n’est pas un service d’authentification réel.

## 3. Fonctionnalités

- **Admin :** tableau de bord avec période, ventes, panier moyen, tickets payés/ouverts, ventes par jour et produits vendus ; gestion utilisateurs/rôles/activation/champ de mot de passe ; catégories et réorganisation ; produits, prix TND à 3 décimales, disponibilité, image avec recadrage carré centré ; tables, QR PNG, téléchargement, impression et régénération ; accès aux tickets et paiements.
- **Cuisine / comptoir :** tableau des tickets ouverts et notes ; ajouter un article, modifier sa quantité, confirmer sa suppression ; voir les tables ; basculer la disponibilité des produits avec annulation si la requête échoue.
- **Caisse :** filtrer et trier les tickets ; détail ; espèces/carte/autre ; marquer payé puis clôturer, ou payer et clôturer ; reçu imprimable 80 mm.
- **Commun :** français par défaut, anglais et arabe RTL ; thème clair/sombre ; navigation responsive avec barre mobile ; session persistante, routes protégées par rôle ; erreurs normalisées ; Socket.IO avec polling 5 secondes si déconnecté ; son activable par clic utilisateur.

### Pourquoi CONTOIRISTE pour le cuisinier ?

Les documents fournis définissent exactement `ADMIN | CAISSIER | CONTOIRISTE`. Le workspace « Cuisine / comptoir » utilise donc `CONTOIRISTE`, sans inventer de rôle ou d’endpoint. Les états « en préparation » / « prêt » ne sont pas inclus dans le contrat. Pour les ajouter, il faut d’abord une extension du backend.

## 4. Brancher votre vrai backend NestJS

Ce projet contient le **frontend du personnel**. Le backend, MongoDB et le frontend client QR doivent être fournis séparément.

À la racine du projet :

```powershell
Copy-Item .env.example .env
```

Modifiez `.env` :

```dotenv
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

Redémarrez Vite après chaque modification de `.env`. Démarrez NestJS et utilisez les vrais comptes de votre backend. Autorisez l’origine du frontend dans le CORS HTTP **et** Socket.IO (normalement `http://localhost:5173`, ou le port réellement affiché).

Le client ajoute `Authorization: Bearer <jwt>`. Au rechargement, `/auth/me` vérifie le token sauvegardé. Un 401 déconnecte la session. Aucun endpoint de refresh-token n’est ajouté : un token expiré demande une reconnexion. Le stockage local suit les documents fournis. Ne placez aucun secret dans `VITE_` : ces valeurs sont visibles dans le navigateur. Les permissions, le hachage des mots de passe, les prix et les totaux doivent toujours être validés par le serveur.

### Hypothèses d’intégration à vérifier avec votre backend

Les endpoints et enums viennent de `docs/00_SHARED_CONTEXT.md`. Les points suivants n’y sont pas complètement définis :

- Listes CRUD : `{data,meta:{page,limit,total}}`. Le service charge toutes les pages, puis filtre/pagine côté frontend. Pour une grande base, passez à la recherche/pagination serveur.
- Références `tableId`, `categoryId`, `productId` : identifiants sous forme de chaînes, pas objets MongoDB peuplés.
- Création/modification CRUD : réponse = entité sauvegardée avec `_id` ; nécessaire pour uploader l’image après création du produit.
- Utilisateur : le DTO accepte `name`, `username`, `role`, `active` et optionnellement `password`. Le changement de mot de passe passe par le `PATCH /users/:id` générique documenté. Confirmez les champs réels avec votre équipe.
- Upload image multipart : champ `file`. Adaptez `src/services/api.ts` si nécessaire. Les images sont recadrées au carré depuis le centre ; pas d’éditeur de recadrage repositionnable.
- `/tickets` sans filtre renvoie aussi les tickets PAID afin de pouvoir les clôturer après un échec réseau. Les lignes sont obtenues par `/tickets/:id` dans le tableau cuisine.
- Ticket complet : `items: TicketItem[]`.
- Stats : `salesByDay:[{date,total}]`, `topProducts:[{productName,quantity}]`. Les champs internes de ces tableaux ne sont pas précisés dans les documents : adaptez `Stats` ou la normalisation dans `api.stats` si votre backend diffère.
- Socket.IO : namespace `/live`, handshake `auth:{token:accessToken}`. Alignez le parseur du backend.

L’intégration API n’a pas été validée avec un serveur réel fourni par votre équipe.

## 5. QR codes et téléphone

Un QR contient `${baseUrl}/table/${qrToken}` et identifie la **table**, jamais le ticket. La route client `/table/:qrToken` appartient au **frontend client séparé** ; ce projet comprend uniquement le personnel. Dans la fenêtre QR, renseignez l’adresse hébergeant cette application client.

Pour un test en réseau local, utilisez l’IP de l’ordinateur, par exemple `http://192.168.1.20:5173`, au lieu de localhost. Le téléphone doit être sur le même réseau. Les URL API/socket doivent aussi être joignables depuis le téléphone. `npm run dev` écoute déjà sur `0.0.0.0`. Vérifiez les ports et le pare-feu. Les données démo ne se synchronisent pas entre appareils.

## 6. Test manuel conseillé

1. Admin : créer catégorie, produit et utilisateur ; modifier ; confirmer/annuler suppression ; essayer une image et un prix `12.500`.
2. Tables : ajouter une table ; ouvrir un QR ; télécharger/imprimer ; confirmer sa régénération et constater le changement de token.
3. Cuisine : ouvrir un ticket, ajouter un produit disponible, changer quantité, supprimer une ligne ; vérifier le total et l’absence de paiement.
4. Disponibilité : désactiver un produit et vérifier qu’il disparaît du sélecteur d’ajout d’article au prochain rafraîchissement.
5. Caisse : payer un ticket sans clôturer, retrouver ce ticket avec le filtre Payé, puis le clôturer ; la table redevient Disponible. Essayer « Payer et clôturer » sur un autre ticket.
6. Imprimer le reçu et vérifier le format avec votre imprimante. Puis vérifier les ventes admin dans la période choisie.
7. Tester arabe RTL, anglais, thème sombre, téléphone, navigation clavier et zoom à 200 %.
8. Mode API : couper le réseau ; vérifier le message d’erreur et le rollback disponibilité ; expirer un token ; simuler une clôture échouée après paiement puis clôturer le ticket PAID sans le repayer.

## 7. Commandes

```powershell
npm.cmd ci           # installer exactement les dépendances du lockfile
npm.cmd run dev      # développement, rechargement automatique
npm.cmd test         # tests Vitest
npm.cmd run build    # vérifications TypeScript + production dans dist/
npm.cmd run preview  # tester le build localement
npm.cmd run format   # formater le code avec Prettier
```

`npm ci` peut prendre quelques minutes la première fois et demande Internet. Pas besoin de `npm audit fix --force` pour démarrer. Si vous modifiez les dépendances, utilisez `npm install` pour mettre le lockfile à jour.

## 8. Structure et premiers repères Vue

```text
qr-restaurant-frontend/
  .env.example
  index.html
  package.json / package-lock.json
  tsconfig.json / vite.config.ts
  README.md / VALIDATION.md
  docs/                       Documents de référence fournis
  src/
    main.ts                   Initialisation Vue et bibliothèques
    App.vue                   Langue, toasts, expiration session
    router.ts                 Routes et accès par rôle
    i18n.ts                   Français, anglais, arabe
    components/               Layout, modal, badge, montant, stepper
    views/                    Écrans du personnel
    services/http.ts          Axios et token JWT
    services/api.ts           Appels API / sélection mode démo
    services/demo.ts          Données et règles de démo
    services/live.ts          Socket.IO et rafraîchissement
    stores/                   Pinia : session et notifications
    types/                    Modèles TypeScript
    utils/                    Argent et traitement d’image
    styles/                   Tokens fournis et interface
  tests/                      Argent et workflow ticket/paiement
```

Un fichier `.vue` contient `<script setup>` pour la logique TypeScript et `<template>` pour l’affichage. Vue Router change d’écran selon l’URL ; Pinia partage l’état ; Axios appelle NestJS ; Vite lance le serveur et crée le build. Commencez par `LoginView.vue`, puis `TicketsView.vue`.

## 9. Dépannage

- **Missing script: dev :** vous êtes dans le mauvais dossier. Faites `Get-Location` et `Get-Content package.json`. Le package doit s’appeler `qr-restaurant-frontend` et avoir `scripts.dev` égal à `vite --host 0.0.0.0`.
- **npm bloqué par PowerShell :** utilisez `npm.cmd` comme dans les commandes ci-dessus.
- **node/npm non reconnu :** installez Node LTS et redémarrez terminal/VS Code.
- **Port occupé :** ouvrez le port indiqué par Vite et ajustez CORS si nécessaire.
- **Toujours en démo :** mettez `VITE_DEMO_MODE=false` et redémarrez Vite.
- **401 en mode API :** vérifiez le vrai compte backend et le token ; les comptes démo ne sont pas des comptes NestJS.
- **404 en rechargeant une page hébergée :** configurez la redirection SPA vers `index.html` sur votre hébergeur.

## Périmètre

Les documents joints sont du contexte de projet, pas des demandes séparées de développer backend, mobile ou application client. Le présent livrable est le frontend personnel. Catégories réordonnées par boutons accessibles ; impression QR de la table sélectionnée ; graphiques CSS légers avec valeurs textuelles ; pas de Storybook ni de parcours E2E client → caisse. La page hébergée sert à tester la démo et à télécharger le ZIP ; le code téléchargé fonctionne indépendamment de l’hébergement Sites.
