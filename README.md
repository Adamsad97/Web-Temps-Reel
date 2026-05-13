# AVENIR Bank — Web en Temps Réel

## Prérequis

- https://www.docker.com/
- https://docs.docker.com/compose/
- Ports `3000` et `4000` disponibles

## Étapes

```bash
# 1. Cloner le projet
git clone https://github.com/Adamsad97/Web-Temps-Reel.git
cd Web-Temps-Reel

# 2. Lancement du projet avec Docker Compose
docker-compose up --build

# 3. Accéder à l'application
# Frontend : http://localhost:3000
# Backend  : http://localhost:4000
# Health   : http://localhost:4000/health

# 4. Pour arrêter le projet avec Docker Compose
docker compose down
```

> Les fixtures sont automatiquement chargées au démarrage du backend (seed automatique).

---

## Comptes de test (Fixtures)

**Client**
Email : pascal@avenir.fr
Password : Pascal1234!

**Conseiller**
Email : dupont@avenir.fr
Password : Dupont1234!

**Directeur**
Email : diawara@avenir.fr
Password : Diawara1234!

Les fixtures sont créées automatiquement au démarrage. Aucune action supplémentaire requise.

---

## Stack technique

- **Backend** : Express + Socket.io (TypeScript)
- **Frontend** : Next.js 14 + socket.io-client (TypeScript)
- **Temps réel** :
  - WebSocket via **Socket.io** → messagerie privée, canal interne, groupes de discussion, indicateurs de frappe
  - **SSE** → flux d'actualités et notifications
  - **Web Push** → notifications navigateur hors-ligne
- **Auth** : JWT (transmis via `socket.handshake.auth.token`)
