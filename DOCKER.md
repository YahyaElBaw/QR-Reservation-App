# Lancer le projet avec Docker

## Il faut seulement
**Docker Desktop** (https://www.docker.com/products/docker-desktop/), lancé ("Engine running").
Pas besoin d'installer Node, TypeScript ni MongoDB.

## Lancer (1 commande)
Dans le dossier du projet (là où se trouve `docker-compose.yml`) :

```
docker compose up --build
```
(ou double-clic sur `START_DOCKER.bat` sous Windows)

La première fois, cela prend quelques minutes. Les comptes, tables et menu de départ
sont créés automatiquement.

## Ouvrir
| Quoi | Adresse |
|---|---|
| Site (personnel) | http://localhost:8080/staff/login |
| Documentation API | http://localhost:3000/docs |
| Santé du serveur | http://localhost:3000/health |

Comptes : `admin / Admin123!` · `caissier / Caissier123!` · `contoiriste / Contoir123!`

## Les 4 services
| Service | Rôle |
|---|---|
| `mongo` | Base de données MongoDB locale |
| `backend` | API NestJS (port 3000) |
| `seed` | Crée les données de départ, puis s'arrête (normal) |
| `frontend` | Site Vue servi par Nginx (port 8080) |

## Commandes utiles
```
docker compose up -d          # lancer en arrière-plan
docker compose logs -f backend  # voir les messages du backend
docker compose down           # arrêter
docker compose down -v        # arrêter ET effacer la base
docker compose up --build     # relancer après un changement de code
```

## Réglages (facultatif)
Le projet marche sans configuration. Pour changer quelque chose, copiez
`.env.example` en `.env` et modifiez :
- **MongoDB Atlas** au lieu de la base locale : décommentez `MONGO_URI`.
- **Images de produits** : mettez vos vraies clés Cloudinary.
- **Tester avec un téléphone** : `CLIENT_BASE_URL=http://IP_DU_PC:8080`.

Ne mettez jamais `.env` sur GitHub (il est déjà ignoré par git).

## Remarques
- Le site appelle l'API sur `http://<adresse-du-site>:3000` : gardez le port 3000 ouvert.
- Le mobile (Expo) ne passe pas par Docker : voir `mobile/` et `README.md`.
- Ce mode utilise `NODE_ENV=development` (réseau local accepté). Pour une vraie mise en ligne,
  il faudra un mode production, HTTPS et de vrais secrets.
