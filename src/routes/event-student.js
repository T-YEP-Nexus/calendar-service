const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabaseClient.js");

// crud routes for the 'event-student' table
/**
 * @swagger
 * tags:
 *   name: EventStudents
 *   description: Student assignments to events
 */

// get all event-students
/**
 * @swagger
 * /event-students:
 *   get:
 *     summary: Get all event-student links
 *     tags: [EventStudents]
 *     responses:
 *       200:
 *         description: Event-student list retrieved
 */
router.get("/event-students", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("event_student")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching event-students:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event-students",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Event students retrieved successfully",
      data: data,
      count: data.length,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

// get a event-students by id
/**
 * @swagger
 * /event-students/{id}:
 *   get:
 *     summary: Get an event-student link by ID
 *     tags: [EventStudents]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Event-student ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link found
 *       404:
 *         description: Not found
 */
router.get("/event-students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("event_student")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116" || data === null) {
        return res.status(404).json({
          success: false,
          message: "Event student not found",
        });
      }

      console.error("Error fetching event student:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event student",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Event student retrieved successfully",
      data: data,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

// get an event-students by student id
/**
 * @swagger
 * /event-students/student/{id_student}:
 *   get:
 *     summary: Get all events assigned to a student
 *     tags: [EventStudents]
 *     parameters:
 *       - name: id_student
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assignments found
 *       400:
 *         description: Invalid student ID
 */
router.get("/event-students/student/:id_student", async (req, res) => {
  try {
    const { id_student } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id_student || !uuidRegex.test(id_student)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID provided'
      });
    }

    const { data, error } = await supabase
      .from("event_student")
      .select("*")
      .eq("id_student", id_student);

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Student id not found",
        });
      }

      console.error("Error fetching event student by student id:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event student",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Event student retrieved successfully",
      data: data,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

// create an event-students with required fields
/**
 * @swagger
 * /event-students:
 *   post:
 *     summary: Assign a student to an event
 *     tags: [EventStudents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_student
 *               - id_event
 *             properties:
 *               id_student:
 *                 type: string
 *               id_event:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created
 *       400:
 *         description: Invalid data
 *       409:
 *         description: Already assigned
 */
router.post("/event-students", async (req, res) => {
  try {
    const { id_student, id_event } = req.body;

    if ( !id_student || !id_event ) {
        return res.status(400).json({
        success: false,
        message:
            "Student id and event id are required to create an event-student",
        });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id_student || !uuidRegex.test(id_student)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID provided",
      });
    }

    const { data: existingEvent, error: checkError } = await supabase
      .from("event_student")
      .select("id_student")
      .eq("id_event", id_event)
      .eq("id_student", id_student)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing event student:", checkError);
      return res.status(500).json({
        success: false,
        message: "Failed to check existing event student",
        error: checkError.message,
      });
    }

    if (existingEvent) {
        return res.status(409).json({
            success: false,
            message: "Event student with this student id and event id already exists",
        });
    }

    const { data, error } = await supabase
      .from("event_student")
      .insert([
        {
          id_student,
          id_event
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating event student:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create event student",
        error: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Event student created successfully",
      data: data,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

// update an event-students fields
/**
 * @swagger
 * /event-students/{id}:
 *   patch:
 *     summary: Update a student-event assignment
 *     tags: [EventStudents]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_student:
 *                 type: string
 *               id_event:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assignment updated
 *       400:
 *         description: Bad request
 *       409:
 *         description: Duplicate assignment
 */
router.patch('/event-students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_student, id_event } = req.body;

    if (!id_student && !id_event) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (student id or event id) must be provided'
      });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const updateData = {};

    if (id_student) {
        if (!uuidRegex.test(id_student)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student ID format'
            });
        }

        updateData.id_student = id_student;
    }

    if (id_event) {
        const { data: event, error: eventError } = await supabase
            .from("event")
            .select("id")
            .eq("id", id_event)
            .single();

        if (eventError || !event) {
            return res.status(404).json({
            success: false,
            message: 'Event not found'
            });
        }
        
        updateData.id_event = id_event;
    }

    const { data: currentRow, error: currentError } = await supabase
        .from("event_student")
        .select("id, id_student, id_event")
        .eq("id", id)
        .single();

    if (currentError || !currentRow) {
        return res.status(404).json({
            success: false,
            message: "Event student not found",
        });
    }

    const finalStudentId = updateData.id_student || currentRow.id_student;
    const finalEventId = updateData.id_event || currentRow.id_event;

    const { data: duplicate, error: dupError } = await supabase
        .from("event_student")
        .select("id")
        .eq("id_student", finalStudentId)
        .eq("id_event", finalEventId)
        .neq("id", id)
        .maybeSingle();

    if (dupError) {
        console.error("Error checking for duplicate:", dupError);
        return res.status(500).json({
            success: false,
            message: "Failed to check for duplicate event-student",
            error: dupError.message,
        });
    }

    if (duplicate) {
        return res.status(409).json({
            success: false,
            message: "This student is already assigned to this event",
        });
    }

    const { data, error } = await supabase
        .from("event_student")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating event student:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update event student",
            error: error.message
        });
    }

    res.status(200).json({
      success: true,
      message: 'Event student updated successfully',
      data: data
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// delete a user
/**
 * @swagger
 * /event-students/{id}:
 *   delete:
 *     summary: Delete an event-student link
 *     tags: [EventStudents]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment deleted
 *       404:
 *         description: Not found
 */
router.delete('/event-students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingUser, error: checkError } = await supabase
      .from('event_student')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Event student not found'
        });
      }

      console.error('Error checking event student existence:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check event student existence',
        error: checkError.message
      });
    }

    const { error } = await supabase
      .from('event_student')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event student:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete event student',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event student deleted successfully',
      data: {
        deletedUser: existingUser
      }
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});

// get full agenda for a student
/**
 * @swagger
 * /agenda/student/{id_student}:
 *   get:
 *     summary: Get all event details for a student's agenda
 *     tags: [EventStudents]
 *     parameters:
 *       - name: id_student
 *         in: path
 *         required: true
 *         description: The UUID of the student.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of full event details for the student.
 *       400:
 *         description: Invalid student ID provided.
 *       404:
 *         description: No events found for this student.
 */
router.get("/agenda/student/:id_student", async (req, res) => {
  try {
    const { id_student } = req.params;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id_student || !uuidRegex.test(id_student)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID provided",
      });
    }

    // 1. Get all event_student entries for the student
    const { data: studentEvents, error: studentEventsError } = await supabase
      .from("event_student")
      .select("id_event")
      .eq("id_student", id_student);

    if (studentEventsError) {
      console.error("Error fetching student's events:", studentEventsError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch student's event registrations",
        error: studentEventsError.message,
      });
    }

    if (!studentEvents || studentEvents.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No events found for this student.",
        data: [],
      });
    }

    // 2. Extract event IDs
    const eventIds = studentEvents.map((se) => se.id_event);

    // 3. Fetch full details for those event IDs
    const { data: events, error: eventsError } = await supabase
      .from("event")
      .select("*")
      .in("id", eventIds)
      .order("event_datetime", { ascending: true });

    if (eventsError) {
      console.error("Error fetching event details:", eventsError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event details",
        error: eventsError.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Student agenda retrieved successfully",
      data: events,
    });
  } catch (err) {
    console.error("Unexpected error in student agenda route:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

module.exports = router;
