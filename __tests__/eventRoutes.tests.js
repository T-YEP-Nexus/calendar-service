const request = require("supertest");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import the app setup
const auth = require("../src/middleware/auth");
const eventRoutes = require("../src/routes/event/event.js");
const eventMiscRoutes = require("../src/routes/event/misc/misc.js");

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

app.use("", eventRoutes);
app.use("", eventMiscRoutes);

// Use the app for testing instead of external URL
const BASE_URL = app;

let testEventId = null;
let validEventId = null;
let validStudentId = null;

// Helper function to get a valid event ID from database
async function getValidEventId() {
  const response = await request(BASE_URL).get("/events");
  if (response.status === 200 && response.body.data.length > 0) {
    return response.body.data[0].id;
  }
  return null;
}

// Helper function to get a valid student ID (we'll use a known UUID)
function getValidStudentId() {
  return "06f5fc8f-b654-4571-a1c4-131491b7b8d9"; // Known valid student ID
}

describe("Event CRUD Routes (Integration)", () => {
  // Setup: Get valid IDs before running tests
  beforeAll(async () => {
    try {
      validEventId = await getValidEventId();
      validStudentId = getValidStudentId();
    } catch (error) {
      console.error("Failed to setup test data:", error);
    }
  });

  describe("GET /events - Get all events", () => {
    it("should return all events successfully", async () => {
      const response = await request(BASE_URL).get("/events");
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /events/:id - Get event by ID", () => {
    it("should return event by valid ID", async () => {
      if (!validEventId) {
        console.warn("No valid event ID found, skipping test");
        return;
      }
      
      const response = await request(BASE_URL).get(`/events/${validEventId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validEventId);
    });

    it("should return 404 for non-existent event", async () => {
      const response = await request(BASE_URL).get("/events/60000000000");
      expect(response.status).toBe(404);
    });
  });

  describe("GET /events/type/:type - Get event by event type", () => {
    it("should return event by valid event type", async () => {
      const type = "keynote";
      const response = await request(BASE_URL).get(`/events/type/${type}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      response.body.data.forEach((entry) => {
        expect(entry.event_type).toBe(type);
      });
    });

    it("should return 400 for invalid type", async () => {
      const response = await request(BASE_URL).get("/events/type/invalidtype");
      expect(response.status).toBe(400);
    });
  });

  describe("POST /events - Create new event", () => {
         it("should create event successfully", async () => {
       const newEvent = {
         title: `Test Event Unit Test ${Date.now()}`,
         event_datetime: "2025-07-29T16:15:15.000Z", // must be strict ISO
         duration_minutes: 60,
         description: "Test Event Description Unit Test",
         event_type: "other",
         report: "good report",
         id_creator: validStudentId,
         id_prom: "388bf596-6be5-4fee-b227-38bab0d5ed4a",
         target_promotions: null, // explicit for the "all students" case
       };

      const response = await request(BASE_URL).post("/events").send(newEvent);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newEvent.title);

      // extra checks for defaults
      expect(response.body.data.slot_duration).toBe(30);
      expect(response.body.data.allow_multiple_users).toBe(false);

      testEventId = response.body.data.id;
    });

         it("should return 409 for existing event", async () => {
       const duplicateEvent = {
         title: "Keynote T-DOP-603",
         event_datetime: "2025-07-17T14:15:15.000Z", // strict ISO
         duration_minutes: 60,
         description: "Test Event Description Unit Test",
         event_type: "keynote",
         report: "good report",
         id_creator: validStudentId,
         id_prom: "388bf596-6be5-4fee-b227-38bab0d5ed4a",
         target_promotions: [], // optional, can be empty array
       };

      const response = await request(BASE_URL)
        .post("/events")
        .send(duplicateEvent);
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already exists/);
    });

    it("should return 400 for missing fields", async () => {
      const response = await request(BASE_URL).post("/events").send({
        title: "New event without required fields",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/required/);
    });

         it("should return 400 for invalid datetime format", async () => {
       const badDateEvent = {
         title: "Invalid Date Event",
         event_datetime: "2025-07-29 16:15:15+00", // wrong format
         duration_minutes: 60,
         event_type: "other",
         id_creator: validStudentId,
       };

      const response = await request(BASE_URL)
        .post("/events")
        .send(badDateEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Invalid event_datetime format/);
    });

         it("should return 400 for invalid event_type", async () => {
       const badTypeEvent = {
         title: "Invalid Type Event",
         event_datetime: "2025-07-29T16:15:15.000Z",
         duration_minutes: 60,
         event_type: "invalid-type",
         id_creator: validStudentId,
       };

      const response = await request(BASE_URL)
        .post("/events")
        .send(badTypeEvent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Invalid event_type/);
    });
  });

  describe("DELETE /events/:id - Delete event", () => {
    it("should delete event successfully", async () => {
      expect(testEventId).toBeTruthy();
      const response = await request(BASE_URL).delete(`/events/${testEventId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 404 for already deleted event", async () => {
      const response = await request(BASE_URL).delete(`/events/${testEventId}`);
      expect(response.status).toBe(404);
    });
  });
});
