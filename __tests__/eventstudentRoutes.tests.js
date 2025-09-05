const request = require("supertest");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import the app setup
const auth = require("../src/middleware/auth");
const eventStudentRoutes = require("../src/routes/eventStudents/event-student.js");
const eventStudentMiscRoutes = require("../src/routes/eventStudents/misc/misc.js");

// Create test app
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use(auth);

app.use("", eventStudentRoutes);
app.use("", eventStudentMiscRoutes);

// Use the app for testing instead of external URL
const BASE_URL = app;

let testStudentEventId = null;
let validEventId = null;
let validStudentId = null;
let validEventStudentId = null;

// Helper function to get a valid event ID from database
async function getValidEventId() {
  const response = await request(BASE_URL).get("/events");
  if (response.status === 200 && response.body.data.length > 0) {
    return response.body.data[0].id;
  }
  
  // If no events exist, create one for testing
  const newEvent = {
    title: `Test Event for Student Tests ${Date.now()}`,
    event_datetime: "2025-07-29T16:15:15.000Z",
    duration_minutes: 60,
    description: "Test Event for Student Tests",
    event_type: "other",
    report: "test report",
    id_creator: "06f5fc8f-b654-4571-a1c4-131491b7b8d9",
    id_prom: "388bf596-6be5-4fee-b227-38bab0d5ed4a",
    target_promotions: null,
  };
  
  const createResponse = await request(BASE_URL).post("/events").send(newEvent);
  if (createResponse.status === 201) {
    return createResponse.body.data.id;
  }
  
  return null;
}

// Helper function to get a valid student ID
function getValidStudentId() {
  return "06f5fc8f-b654-4571-a1c4-131491b7b8d9"; // Known valid student ID
}

// Helper function to get a valid event-student ID from database
async function getValidEventStudentId() {
  const response = await request(BASE_URL).get("/event-students");
  if (response.status === 200 && response.body.data.length > 0) {
    return response.body.data[0].id;
  }
  return null;
}

describe("EventStudent CRUD Routes (Integration)", () => {
  // Setup: Get valid IDs before running tests
  beforeAll(async () => {
    try {
      validEventId = await getValidEventId();
      validStudentId = getValidStudentId();
      validEventStudentId = await getValidEventStudentId();
      
      // Create a test event-student if none exists
      if (validEventId && validStudentId && !validEventStudentId) {
        const newStudentEvent = {
          id_student: validStudentId,
          id_event: validEventId,
        };
        
        const response = await request(BASE_URL)
          .post("/event-students")
          .send(newStudentEvent);
          
        if (response.status === 201) {
          testStudentEventId = response.body.data.id;
        }
      }
    } catch (error) {
      console.error("Failed to setup test data:", error);
    }
  });

  describe("GET /event-students - Get all event students", () => {
    it("should return all student events successfully", async () => {
      const response = await request(BASE_URL).get("/event-students");
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /event-students/:id - Get event student by ID", () => {
    it("should return student event by valid ID", async () => {
      if (!validEventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL).get(
        `/event-students/${validEventStudentId}`
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validEventStudentId);
    });

    it("should return 404 for non-existent student event", async () => {
      const response = await request(BASE_URL).get(
        "/event-students/60000000000"
      );
      expect(response.status).toBe(404);
    });
  });

  describe("GET /event-students/student/:id_student - Get event student by student id", () => {
    it("should return student event by valid student id", async () => {
      if (!validStudentId) {
        console.warn("No valid student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL).get(
        `/event-students/student/${validStudentId}`
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      response.body.data.forEach((entry) => {
        expect(entry.id_student).toBe(validStudentId);
      });
    });

    it("should return 400 for invalid uuid format", async () => {
      const response = await request(BASE_URL).get(
        "/event-students/student/invalid-student-id"
      );
      expect(response.status).toBe(400);
    });

    it("should return 400 for non-existent student id", async () => {
      const response = await request(BASE_URL).get(
        "/event-students/student/00000000-0000-0000-0000-000000000000"
      );
      expect(response.status).toBe(400);
    });
  });

  describe("POST /event-students - Create new student event", () => {
         it("should create student event successfully", async () => {
       if (!validEventId || !validStudentId) {
         console.warn("No valid event or student ID found, skipping test");
         return;
       }
       
       const newStudentEvent = {
         id_student: validStudentId,
         id_event: validEventId,
       };

      const response = await request(BASE_URL)
        .post("/event-students")
        .send(newStudentEvent);
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id_student).toBe(newStudentEvent.id_student);

      testStudentEventId = response.body.data.id;
    });

         it("should return 409 for existing event student", async () => {
       if (!validEventId || !validStudentId) {
         console.warn("No valid event or student ID found, skipping test");
         return;
       }
       
       // Try to create the same event-student relationship again
       const response = await request(BASE_URL)
         .post("/event-students")
         .send({
           id_event: validEventId,
           id_student: validStudentId,
         });
       expect(response.status).toBe(409);
     });

         it("should return 400 for missing fields", async () => {
       const response = await request(BASE_URL)
         .post("/event-students")
         .send({ id_event: validEventId || 1 });
       expect(response.status).toBe(400);
     });

    it("should return 400 for invalid student id format", async () => {
      const response = await request(BASE_URL)
        .post("/event-students")
        .send({ id_student: "badidformat123" });
      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /event-students/:id - Update student event", () => {
    it("should update the student event successfully", async () => {
      const eventStudentId = testStudentEventId || validEventStudentId;
      if (!eventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL)
        .patch(`/event-students/${eventStudentId}`)
        .send({ id_event: validEventId || 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 400 for no update fields", async () => {
      const eventStudentId = testStudentEventId || validEventStudentId;
      if (!eventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL)
        .patch(`/event-students/${eventStudentId}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return 404 for unexisting event id", async () => {
      const eventStudentId = testStudentEventId || validEventStudentId;
      if (!eventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL)
        .patch(`/event-students/${eventStudentId}`)
        .send({ id_event: 100000000 });

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid student id format", async () => {
      const eventStudentId = testStudentEventId || validEventStudentId;
      if (!eventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL)
        .patch(`/event-students/${eventStudentId}`)
        .send({ id_student: "badidformat123" });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /event-students/:id - Delete student event", () => {
    it("should delete student event successfully", async () => {
      const eventStudentId = testStudentEventId || validEventStudentId;
      if (!eventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL).delete(
        `/event-students/${eventStudentId}`
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 404 for already deleted student event", async () => {
      const eventStudentId = testStudentEventId || validEventStudentId;
      if (!eventStudentId) {
        console.warn("No valid event-student ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL).delete(
        `/event-students/${eventStudentId}`
      );
      expect(response.status).toBe(404);
    });
  });
});
