### Prérequis

- https://www.docker.com/
- https://docs.docker.com/compose/
- Ports `3000` et `4000` disponibles

### Étapes

```bash
# 1. Cloner le projet
git clone https://github.com/Adamsad97/Web-Temps-Reel.git
cd Web-Temps-Reel

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

## Comptes de test (Fixtures)

**Client**  
Email : pascal@avenir.fr
password: Pascal1234!

**Conseiller**  
Email : dupont@avenir.fr
Password : Dupont1234!

**Directeur**  
Email : diawara@avenir.fr
Password : Diawara1234!

Les fixtures sont créées automatiquement au démarrage. Aucune action supplémentaire requise.
