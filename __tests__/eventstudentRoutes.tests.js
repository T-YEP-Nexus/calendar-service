const request = require('supertest');

const BASE_URL = 'http://localhost:3002';

let testStudentEventId = null;

describe('EventStudent CRUD Routes (Integration)', () => {
  describe('GET /event-students - Get all event students', () => {
    it('should return all student events successfully', async () => {
      const response = await request(BASE_URL).get('/event-students');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /event-students/:id - Get event student by ID', () => {
    //change a valide event student id
    const validID = 46;

    it('should return student event by valid ID', async () => {
      const response = await request(BASE_URL).get(`/event-students/${validID}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(validID);
    });

    it('should return 404 for non-existent student event', async () => {
      const response = await request(BASE_URL).get('/event-students/60000000000');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /event-students/student/:id_student - Get event student by student id', () => {
    it('should return student event by valid student id', async () => {
      const student_id = '06f5fc8f-b654-4571-a1c4-131491b7b8d9';
      const response = await request(BASE_URL).get(`/event-students/student/${student_id}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      response.body.data.forEach((entry) => {
        expect(entry.id_student).toBe(student_id);
      });
    });

    it('should return 400 for invalid uuid format', async () => {
      const response = await request(BASE_URL).get('/event-students/student/invalid-student-id');
      expect(response.status).toBe(400);
    });

    it('should return 400 for non-existent student id', async () => {
      const response = await request(BASE_URL).get('/event-students/student/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(400);
    });
  });

  describe('POST /event-students - Create new student event', () => {
    it('should create student event successfully', async () => {
      const newStudentEvent = {
        id_student: 'a61ea8ad-498e-4811-82af-55505f83489a',
        id_event: 3
      };

      const response = await request(BASE_URL).post('/event-students').send(newStudentEvent);
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id_student).toBe(newStudentEvent.id_student);

      testStudentEventId = response.body.data.id;
    });

    it('should return 409 for existing event student', async () => {
        // change id envent and the student id affiliated to it
        const response = await request(BASE_URL).post('/event-students').send({ id_event: 46, id_student: '8c80cb18-daeb-40c2-8471-beb6a669e5c8' });
        expect(response.status).toBe(409);
      });

    it('should return 400 for missing fields', async () => {
      const response = await request(BASE_URL).post('/event-students').send({ id_event: 3 });
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid student id format', async () => {
      const response = await request(BASE_URL).post('/event-students').send({ id_student: 'badidformat123' });
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /event-students/:id - Update student event', () => {

    it('should update the student event successfully', async () => {
      expect(testStudentEventId).toBeTruthy();
      const response = await request(BASE_URL)
        .patch(`/event-students/${testStudentEventId}`)
        .send({ id_event: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for no update fields', async () => {
      const response = await request(BASE_URL)
        .patch(`/event-students/${testStudentEventId}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for unexisting event id', async () => {
        const response = await request(BASE_URL)
          .patch(`/event-students/${testStudentEventId}`)
          .send({ id_event: 100000000 });
  
        expect(response.status).toBe(404);
    });

    it('should return 400 for invalid student id format', async () => {
        const response = await request(BASE_URL)
          .patch(`/event-students/${testStudentEventId}`)
          .send({ id_student: 'badidformat123' });
  
        expect(response.status).toBe(400);
      });
  });

  describe('DELETE /event-students/:id - Delete student event', () => {

    it('should delete student event successfully', async () => {
      expect(testStudentEventId).toBeTruthy();
      const response = await request(BASE_URL).delete(`/event-students/${testStudentEventId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for already deleted student event', async () => {
      const response = await request(BASE_URL).delete(`/event-students/${testStudentEventId}`);
      expect(response.status).toBe(404);
    });
  });
});
