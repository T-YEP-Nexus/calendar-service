# Calendar Microservice

This microservice manages calendar events and event-student relationships. It provides CRUD operations on `event` and `event_student` tables.

---

## API Routes

### Event-Student Routes

| Method | Endpoint                         | Description                                  |
|--------|---------------------------------|----------------------------------------------|
| GET    | `/event-students`               | Get all event-students                        |
| GET    | `/event-students/:id`           | Get event-student by ID                       |
| GET    | `/event-students/student/:id_student` | Get event-students by student ID              |
| POST   | `/event-students`               | Create new event-student (assign student to event) |
| PATCH  | `/event-students/:id`           | Update event-student                          |
| DELETE | `/event-students/:id`           | Delete event-student                          |

---

### Event Routes

| Method | Endpoint           | Description                         |
|--------|--------------------|-----------------------------------|
| GET    | `/events`          | Get all events                    |
| GET    | `/events/:id`      | Get event by ID                  |
| GET    | `/events/type/:type` | Get events filtered by event type  |
| POST   | `/events`          | Create a new event                |
| PATCH  | `/events/:id`      | Update an event                  |
| DELETE | `/events/:id`      | Delete an event                  |

---

## API Description

- **Event-Student**: Manage relationships assigning students to events.
  - Creating prevents duplicates for the same student-event pair.
  - Validates UUID formats for student IDs.
  - Supports filtering by student ID.

- **Event**: Manage events with detailed info including:
  - Title, date/time, duration, description, event type, report, creator ID.
  - Validations include date/time format, positive duration, allowed event types, and unique event constraints.
  - Supports filtering by event type (e.g., "follow-up", "kick-off", "keynote", "hub-talk", "other").

- **Update routes** support partial updates with validation on input fields.
- **Delete routes** confirm existence before deletion.

---

## Swagger Documentation

Full API docs and interactive testing:

**[Calendar Microservice Swagger Documentation](http://localhost:3002/api-docs)**
