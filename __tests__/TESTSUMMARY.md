# 📊 Résumé des Tests Backend – Event Service

## 🎯 Objectif

Valider le fonctionnement complet des endpoints Event et EventStudent dans le service backend calendar-service. La suite teste les routes CRUD pour les événements et pour les participations des étudiants aux événements, en incluant les cas de succès et d'erreur.

## 🏗️ Architecture des Tests

### Event Routes (5 suites principales)

| Suite | Nombre de tests | Description |
|-------|----------------|-------------|
| `GET /events` | 1 | Récupération de tous les événements |
| `GET /events/:id` | 2 | Récupération par ID valide et ID inexistant |
| `GET /events/type/:type` | 2 | Récupération par type valide et type invalide |
| `POST /events` | 5 | Création réussie, doublon, champs manquants, datetime invalide, type invalide |
| `DELETE /events/:id` | 2 | Suppression réussie et tentative sur événement déjà supprimé |

**Total : 12 tests Event**

### EventStudent Routes (6 suites principales)

| Suite | Nombre de tests | Description |
|-------|----------------|-------------|
| `GET /event-students` | 1 | Récupération de toutes les participations étudiants |
| `GET /event-students/:id` | 2 | Récupération par ID valide et inexistant |
| `GET /event-students/student/:id_student` | 3 | Récupération par student ID valide, format invalide, et student inexistant |
| `POST /event-students` | 4 | Création réussie, doublon, champs manquants, ID invalide |
| `PATCH /event-students/:id` | 4 | Mise à jour réussie, sans champs, ID inexistant, ID étudiant invalide |
| `DELETE /event-students/:id` | 2 | Suppression réussie et tentative sur participation déjà supprimée |

**Total : 16 tests EventStudent**

**Grand total : 28 tests CRUD backend**

## 🔐 Couverture Fonctionnelle

### Event Routes

- **GET /events** – Vérifie la récupération de tous les événements
- **GET /events/:id** – Récupération par ID valide / gestion du 404
- **GET /events/type/:type** – Filtrage par type valide / 400 pour type invalide
- **POST /events** – Création, doublon (409), champs manquants (400), datetime invalide (400), type invalide (400)
- **DELETE /events/:id** – Suppression et gestion du 404

### EventStudent Routes

- **GET /event-students** – Récupération de toutes les participations
- **GET /event-students/:id** – Récupération par ID valide / 404 si inexistant
- **GET /event-students/student/:id_student** – Vérification des participations par student, gestion UUID invalide et non-existant
- **POST /event-students** – Création, doublon (409), champs manquants (400), ID invalide (400)
- **PATCH /event-students/:id** – Mise à jour réussie, gestion 400 et 404, validation ID étudiant
- **DELETE /event-students/:id** – Suppression et tentative sur participation déjà supprimée

## 📁 Structure des Fichiers de Test

```
__tests__/
├── eventRoutes.tests.js          # Tests CRUD Events
├── eventStudentRoutes.tests.js   # Tests CRUD EventStudent
└── README.md                     # Documentation des tests
```

## 🚀 Scripts de Test Disponibles

```bash
npm test __tests__/eventRoutes.tests.js          # Tests Event
npm test __tests__/eventStudentRoutes.tests.js   # Tests EventStudent
npm test                                         # Tous les tests
```

## ✅ Statut Actuel

⚠️ **Les tests dépendent d'une instance live du serveur calendar-service sur http://localhost:3002**

💻 **Avec le serveur et la DB opérationnelle, tous les 28 tests passent (100%)**

🔄 **Les tests incluent les scénarios succès et erreurs pour chaque route**

## 🔍 Ce qui est Testé

### Event Routes
- Intégrité des créations et suppressions d'événements
- Validation des champs requis, format datetime ISO, type d'événement
- Gestion des doublons et erreurs (400, 404, 409)
- Récupération : liste complète, par ID, par type

### EventStudent Routes
- Intégrité des créations, mises à jour et suppressions de participations
- Validation des champs requis, format UUID des étudiants
- Gestion des doublons, ID inexistant et erreurs 400 / 404
- Récupération : liste complète, par ID, par student ID

## 🎯 Avantages de cette Approche

- **Tests complets backend** – Vérifie tous les endpoints CRUD
- **Validation robuste** – Cas de succès et erreurs couvert
- **Fiabilité** – Chaque test valide la réponse HTTP et le contenu
- **Maintenance facile** – Tests clairs et isolés par route
- **Rapidité** – Exécution rapide tant que le serveur est lancé

## 🚀 Utilisation Recommandée

### Pour le développement quotidien :
```bash
npm test __tests__/eventRoutes.tests.js
npm test __tests__/eventStudentRoutes.tests.js
```

### Pour la validation complète :
```bash
npm test
```

## 📝 Notes de Développement

- `testEventId` et `testStudentEventId` sont utilisés pour vérifier suppression/mise à jour
- La suite teste à la fois les scénarios réussis et les erreurs attendues
- **Dépendances** : serveur live et base de données opérationnelle