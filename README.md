# 📅 Microservice Calendrier

## 🎯 **Vue d'Ensemble**

Ce microservice gère l'écosystème calendrier de Nexus avec deux entités principales :
- **📋 Événements** - Cours, réunions, présentations et activités
- **👥 Participations** - Relations entre événements et étudiants

Le service fournit des **opérations CRUD complètes** avec validation avancée et gestion des relations.

---

## ⚙️ **Configuration & Variables d'Environnement**

### 🔧 Fichier de Configuration

Copiez le fichier de configuration exemple et adaptez-le :

```bash
cp .env.example .env
```

### 📝 Variables Disponibles

| Variable | Description | Valeur Exemple | Obligatoire |
|----------|-------------|----------------|-------------|
| `PORT` | Port d'écoute du service | `3002` | ❌ |
| `NODE_ENV` | Environnement d'exécution | `development` | ✅ |
| `SUPABASE_URL` | URL de votre instance Supabase | `https://xxx.supabase.co` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé de service Supabase (admin) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ |
| `FRONTEND_URL` | URL du frontend pour CORS | `http://localhost:3000` | ✅ |

### 🔐 **Configuration Supabase**

```bash
# Supabase Configuration
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
```

> ⚠️ **Important** : Utilisez la **Service Role Key** pour les opérations backend, pas la clé publique !

### 🌐 **Configuration CORS**

```bash
# Frontend URL pour CORS
FRONTEND_URL=http://localhost:3000
```

---

## 🚀 **Démarrage Rapide**

### 📦 Installation

```bash
# Installation des dépendances
npm install

# Configuration de l'environnement
cp .env.example .env
# ✏️ Éditez le fichier .env avec vos valeurs

# Démarrage du service
npm start
```

### 🌐 Accès au Service

- **Service** : http://localhost:3002
- **Documentation API** : http://localhost:3002/api-docs 📖

---

## 📋 **API Endpoints**

### 👥 **Routes Event-Student** 

<details>
<summary><strong>🔽 Gestion des Participations (6 endpoints)</strong></summary>

| Méthode | Endpoint | Description | Codes Retour |
|---------|----------|-------------|--------------|
| 🔍 `GET` | `/event-students` | Récupérer toutes les participations | `200` |
| 🔍 `GET` | `/event-students/:id` | Récupérer une participation par ID | `200`, `404` |
| 🔍 `GET` | `/event-students/student/:id_student` | Participations d'un étudiant | `200`, `400`, `404` |
| ➕ `POST` | `/event-students` | Assigner un étudiant à un événement | `201`, `400`, `409` |
| ✏️ `PATCH` | `/event-students/:id` | Modifier une participation | `200`, `400`, `404` |
| ❌ `DELETE` | `/event-students/:id` | Supprimer une participation | `200`, `404` |

</details>

### 📅 **Routes Event**

<details>
<summary><strong>🔽 Gestion des Événements (6 endpoints)</strong></summary>

| Méthode | Endpoint | Description | Codes Retour |
|---------|----------|-------------|--------------|
| 🔍 `GET` | `/events` | Récupérer tous les événements | `200` |
| 🔍 `GET` | `/events/:id` | Récupérer un événement par ID | `200`, `404` |
| 🔍 `GET` | `/events/type/:type` | Événements filtrés par type | `200`, `400` |
| ➕ `POST` | `/events` | Créer un nouvel événement | `201`, `400`, `409` |
| ✏️ `PATCH` | `/events/:id` | Modifier un événement | `200`, `400`, `404` |
| ❌ `DELETE` | `/events/:id` | Supprimer un événement | `200`, `404` |

</details>

---

## 🏗️ **Modèles de Données**

### 📅 **Event**
```json
{
  "id": "uuid",
  "title": "string (requis)",
  "datetime": "ISO 8601 (requis)",
  "duration": "number (positif)",
  "description": "string",
  "type": "follow-up|kick-off|keynote|hub-talk|other",
  "report": "string",
  "id_creator": "uuid"
}
```

### 👥 **Event-Student**  
```json
{
  "id": "uuid",
  "id_event": "uuid (requis)",
  "id_student": "uuid (requis)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

## ✨ **Fonctionnalités Avancées**

### 🔒 **Validations**

| Fonctionnalité | Description |
|---------------|-------------|
| **📅 Format DateTime** | Validation ISO 8601 strict |
| **⏱️ Durée Positive** | Durée événement > 0 |
| **🏷️ Types Événements** | Types prédéfinis validés |
| **🔗 UUID Format** | Validation format UUID pour les relations |
| **🚫 Anti-Doublon** | Prévention des participations multiples |

### 🔍 **Fonctionnalités de Filtrage**

- **Par Type** : Filtrage des événements par catégorie
- **Par Étudiant** : Récupération des participations d'un étudiant
- **Validation Relations** : Vérification des liens événement-étudiant

### 📊 **Gestion des Erreurs**

| Code | Signification | Contexte |
|------|---------------|----------|
| `400` | Données invalides | Format, champs requis |
| `404` | Ressource introuvable | ID inexistant |
| `409` | Conflit | Doublon détecté |

---

## 📖 **Documentation Interactive**

### 🌐 **Swagger UI**

Explorez l'API de manière interactive :

**[📋 Documentation Swagger Complète](http://localhost:3002/api-docs)**

**Fonctionnalités disponibles :**
- 🧪 **Tests directs** des endpoints
- 📋 **Schémas de données** détaillés  
- 🔍 **Codes de réponse** expliqués
- 💡 **Exemples** de requêtes et réponses

---

## 🧪 **Tests**

### ▶️ Exécution des Tests

```bash
# Tests complets
npm test

# Tests spécifiques
npm test __tests__/eventRoutes.tests.js
npm test __tests__/eventStudentRoutes.tests.js

# Tests avec coverage
npm run test:coverage
```

### 📊 **Couverture de Tests**

- ✅ **28 tests** au total
- ✅ **Routes Events** : 12 tests
- ✅ **Routes Event-Students** : 16 tests  
- ✅ **Cas d'erreur** inclus

---

## 🚀 **Production & Déploiement**

### 🔧 **Variables Production**

```bash
NODE_ENV=production
PORT=3002
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod_service_key
FRONTEND_URL=https://votre-domaine.com
```

### 🐳 **Docker**

Le service est inclus dans le `docker-compose.yml` principal du projet Nexus.

---

**📅 Calendar Service** - *Part of Nexus Ecosystem*  

🔗 **[Retour au projet principal](https://github.com/T-YEP-Nexus/frontend)**
