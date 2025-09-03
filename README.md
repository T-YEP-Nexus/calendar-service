# Microservice Calendrier

Ce microservice gère les événements du calendrier et les relations entre événements et étudiants. Il fournit des opérations CRUD sur les tables `event` et `event_student`.

---

## Routes API

### Routes Event-Student

| Méthode | Endpoint                         | Description                                     |
|---------|---------------------------------|-------------------------------------------------|
| GET     | `/event-students`               | Récupérer tous les event-students              |
| GET     | `/event-students/:id`           | Récupérer un event-student par ID              |
| GET     | `/event-students/student/:id_student` | Récupérer les event-students d’un étudiant par ID |
| POST    | `/event-students`               | Créer un nouvel event-student (assigner un étudiant à un événement) |
| PATCH   | `/event-students/:id`           | Mettre à jour un event-student                  |
| DELETE  | `/event-students/:id`           | Supprimer un event-student                      |

---

### Routes Event

| Méthode | Endpoint           | Description                             |
|---------|------------------|-----------------------------------------|
| GET     | `/events`         | Récupérer tous les événements          |
| GET     | `/events/:id`     | Récupérer un événement par ID           |
| GET     | `/events/type/:type` | Récupérer les événements filtrés par type |
| POST    | `/events`         | Créer un nouvel événement              |
| PATCH   | `/events/:id`     | Mettre à jour un événement             |
| DELETE  | `/events/:id`     | Supprimer un événement                 |

---

## Description de l’API

- **Event-Student** : Gère les relations en assignant des étudiants à des événements.
  - La création empêche les doublons pour une même paire étudiant-événement.
  - Valide le format UUID pour les IDs des étudiants.
  - Supporte le filtrage par ID étudiant.

- **Event** : Gère les événements avec des informations détaillées telles que :
  - Titre, date/heure, durée, description, type d’événement, rapport, ID du créateur.
  - Les validations incluent le format date/heure, la durée positive, les types d’événement autorisés, et les contraintes d’unicité.
  - Supporte le filtrage par type d’événement (par exemple : "follow-up", "kick-off", "keynote", "hub-talk", "other").

- Les **routes de mise à jour** supportent les mises à jour partielles avec validation des champs.
- Les **routes de suppression** vérifient l’existence avant suppression.

---

## Documentation Swagger

Documentation complète de l’API et tests interactifs :

**[Documentation Swagger du Microservice Calendrier](http://localhost:3002/api-docs)**
