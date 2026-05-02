### Prérequis

- https://www.docker.com/
- https://docs.docker.com/compose/
- Ports `3000` et `4000` disponibles

### Étapes

```bash
# 1. Cloner le projet
git clone <votre-repo>
cd avenir-bank

# 2. Lancer avec Docker Compose
docker-compose up --build

# 3. Accéder à l'application
# Frontend : http://localhost:3000
# Backend  : http://localhost:4000
# Health   : http://localhost:4000/health

# 4. Arrêter le Docker Compose
docker compose down
```

> Les fixtures sont automatiquement chargées au démarrage du backend (seed automatique).

---

## 🧪 Comptes de test (Fixtures)

Les fixtures sont créées automatiquement au démarrage. Aucune action supplémentaire requise.

| Rôle              | Email                  | Mot de passe      |
| ----------------- | ---------------------- | ----------------- |
| 👤 **Client**     | `client@avenir.fr`     | `Client1234!`     |
| 👔 **Conseiller** | `conseiller@avenir.fr` | `Conseiller1234!` |
| 🏛 **Directeur**  | `directeur@avenir.fr`  | `Directeur1234!`  |

Des comptes supplémentaires sont également disponibles :

- Conseiller 2 : `conseiller2@avenir.fr` / `pass`
- Client 2 : `marc@avenir.fr` / `pass`
# Web-Temps-Reel
