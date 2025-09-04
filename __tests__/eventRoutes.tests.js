const request = require('supertest');

const BASE_URL = 'http://localhost:3002';

let testEventId = null;

describe('Event CRUD Routes (Integration)', () => {
  describe('GET /events - Get all events', () => {
    it('should return all events successfully', async () => {
      const response = await request(BASE_URL).get('/events');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /events/:id - Get event by ID', () => {
    const validID = 3;

    it('should return event by valid ID', async () => {
      const response = await request(BASE_URL).get(`/events/${validID}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validID);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(BASE_URL).get('/events/60000000000');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /events/type/:type - Get event by event type', () => {
    it('should return event by valid event type', async () => {
      const type = 'keynote';
      const response = await request(BASE_URL).get(`/events/type/${type}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      response.body.data.forEach((entry) => {
        expect(entry.event_type).toBe(type);
      });
    });

    it('should return 400 for invalid type', async () => {
      const response = await request(BASE_URL).get('/events/type/invalidtype');
      expect(response.status).toBe(400);
    });

  });

  describe('POST /events - Create new event', () => {
  it('should create event successfully', async () => {
    const newEvent = {
      title: 'Test Event Unit Test',
      event_datetime: '2025-07-29T16:15:15.000Z', // must be strict ISO
      duration_minutes: 60,
      description: 'Test Event Description Unit Test',
      event_type: 'other',
      report: 'good report',
      id_creator: '06f5fc8f-b654-4571-a1c4-131491b7b8d9',
      id_prom: '388bf596-6be5-4fee-b227-38bab0d5ed4a',
      target_promotions: null, // explicit for the "all students" case
    };

    const response = await request(BASE_URL).post('/events').send(newEvent);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(newEvent.title);

    // extra checks for defaults
    expect(response.body.data.slot_duration).toBe(30);
    expect(response.body.data.allow_multiple_users).toBe(false);

    testEventId = response.body.data.id;
  });

  it('should return 409 for existing event', async () => {
    const duplicateEvent = {
      title: 'Keynote T-DOP-603',
      event_datetime: '2025-07-17T14:15:15.000Z', // strict ISO
      duration_minutes: 60,
      description: 'Test Event Description Unit Test',
      event_type: 'keynote',
      report: 'good report',
      id_creator: 'a61ea8ad-498e-4811-82af-55505f83489a',
      id_prom: '388bf596-6be5-4fee-b227-38bab0d5ed4a',
      target_promotions: [], // optional, can be empty array
    };

    const response = await request(BASE_URL).post('/events').send(duplicateEvent);
    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/already exists/);
  });

  it('should return 400 for missing fields', async () => {
    const response = await request(BASE_URL).post('/events').send({
      title: 'New event without required fields',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/required/);
  });

  it('should return 400 for invalid datetime format', async () => {
    const badDateEvent = {
      title: 'Invalid Date Event',
      event_datetime: '2025-07-29 16:15:15+00', // wrong format
      duration_minutes: 60,
      event_type: 'other',
      id_creator: '06f5fc8f-b654-4571-a1c4-131491b7b8d9',
    };

    const response = await request(BASE_URL).post('/events').send(badDateEvent);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/Invalid event_datetime format/);
  });

  it('should return 400 for invalid event_type', async () => {
    const badTypeEvent = {
      title: 'Invalid Type Event',
      event_datetime: '2025-07-29T16:15:15.000Z',
      duration_minutes: 60,
      event_type: 'invalid-type',
      id_creator: '06f5fc8f-b654-4571-a1c4-131491b7b8d9',
    };

    const response = await request(BASE_URL).post('/events').send(badTypeEvent);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/Invalid event_type/);
  });
});

  describe('DELETE /events/:id - Delete event', () => {

    it('should delete event successfully', async () => {
      expect(testEventId).toBeTruthy();
      const response = await request(BASE_URL).delete(`/events/${testEventId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for already deleted event', async () => {
      const response = await request(BASE_URL).delete(`/events/${testEventId}`);
      expect(response.status).toBe(404);
    });
  });
});
