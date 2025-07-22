const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabaseClient.js");
const http = require('http');

// crud routes for the 'event' table
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management
 */

// get all events
/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("event")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch events",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
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

// get an event by id
/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Event ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event found
 *       404:
 *         description: Event not found
 */
router.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("event")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116" || data === null) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      console.error("Error fetching event:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
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

// get an event by type
/**
 * @swagger
 * /events/type/{type}:
 *   get:
 *     summary: Get events by type
 *     tags: [Events]
 *     parameters:
 *       - name: type
 *         in: path
 *         required: true
 *         description: Event type (e.g. follow-up, keynote)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Events retrieved
 *       400:
 *         description: Invalid type
 */
router.get("/events/type/:type", async (req, res) => {
  try {
    const { type } = req.params;

    const allowedTypes = [
      "follow-up",
      "kick-off",
      "keynote",
      "hub-talk",
      "other",
    ];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type provided",
      });
    }

    const { data, error } = await supabase
      .from("event")
      .select("*")
      .eq("event_type", type)

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      console.error("Error fetching event by type:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
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

// create an event with required fields
/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - event_datetime
 *               - duration_minutes
 *               - event_type
 *               - id_creator
 *             properties:
 *               title:
 *                 type: string
 *               event_datetime:
 *                 type: string
 *                 format: date-time
 *               duration_minutes:
 *                 type: integer
 *               description:
 *                 type: string
 *               event_type:
 *                 type: string
 *               report:
 *                 type: string
 *               id_creator:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created
 *       400:
 *         description: Bad request
 *       409:
 *         description: Conflict
 */
router.post("/events", async (req, res) => {
  try {
    const {
      title,
      event_datetime,
      duration_minutes,
      description,
      event_type,
      report,
      id_creator,
      id_prom
    } = req.body;

    if (
      !title ||
      !event_datetime ||
      !duration_minutes ||
      !event_type ||
      !id_creator
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, event datetime, event duration, event type and creator id are required to create an event",
      });
    }

    const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}$/;
    if (!dateTimeRegex.test(event_datetime)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid event_datetime format. Expected format: YYYY-MM-DD HH:mm:ss+00",
      });
    }

    if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "duration_minutes must be a positive integer",
      });
    }

    const allowedTypes = [
      "follow-up",
      "kick-off",
      "keynote",
      "hub-talk",
      "other",
    ];
    if (!allowedTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid event_type. Allowed values: ${allowedTypes.join(
          ", "
        )}`,
      });
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id_creator || !uuidRegex.test(id_creator)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID provided",
      });
    }

    const { data: existingEvent, error: checkError } = await supabase
      .from("event")
      .select("id")
      .eq("title", title)
      .eq("event_datetime", event_datetime)
      .eq("event_type", event_type)
      .eq("id_creator", id_creator)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing event:", checkError);
      return res.status(500).json({
        success: false,
        message: "Failed to check existing event",
        error: checkError.message,
      });
    }

    if (existingEvent) {
      return res.status(409).json({
        success: false,
        message: "Event with this name and time already exists",
      });
    }

    const { data, error } = await supabase
      .from("event")
      .insert([
        {
          title,
          event_datetime,
          duration_minutes,
          description,
          event_type,
          report,
          id_creator,
          id_prom,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create event",
        error: error.message,
      });
    }

    if (data && id_prom) {
      const eventId = data.id;

      console.log(`[Event Service] Event ${eventId} created. Now assigning students from promotion ${id_prom}.`);

      const options = {
        hostname: 'localhost',
        port: 3004,
        path: `/students/promotion/${id_prom}`,
        method: 'GET',
      };

      console.log(`[Event Service] Calling profile-service with options:`, options);

      const req = http.request(options, (res) => {
        let studentData = '';
        console.log(`[Event Service] Profile-service response status: ${res.statusCode}`);
        res.on('data', (chunk) => {
          studentData += chunk;
        });
        res.on('end', async () => {
          console.log(`[Event Service] Profile-service response body:`, studentData);
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(studentData);
              const students = parsedData.data;
              console.log(`[Event Service] Parsed students:`, students);

              if (students && students.length > 0) {
                const studentEventInserts = students.map(student => ({
                  id_student: student.profile.id_user,
                  id_event: eventId,
                }));

                console.log(`[Event Service] Preparing to insert into event_student:`, studentEventInserts);

                const { error: insertError } = await supabase
                  .from('event_student')
                  .insert(studentEventInserts);

                if (insertError) {
                  console.error("[Event Service] Error batch inserting students into event:", insertError);
                } else {
                  console.log(`[Event Service] Successfully inserted ${studentEventInserts.length} students into event ${eventId}.`);
                }
              } else {
                console.log("[Event Service] No students found for this promotion, or data format is unexpected.");
              }
            } catch (e) {
              console.error("[Event Service] Error parsing JSON from profile-service:", e);
            }
          } else {
            console.error(`[Event Service] Failed to get students from profile-service. Status: ${res.statusCode}, Body: ${studentData}`);
          }
        });
      });

      req.on('error', (e) => {
        console.error(`[Event Service] Problem with request to profile-service: ${e.message}`);
      });

      req.end();
    }


    res.status(201).json({
      success: true,
      message: "Event created successfully",
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

// // update an event's fields
/**
 * @swagger
 * /events/{id}:
 *   patch:
 *     summary: Update an event
 *     tags: [Events]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Event ID
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               event_datetime:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *               description:
 *                 type: string
 *               event_type:
 *                 type: string
 *               report:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 */
router.patch('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, event_datetime, duration_minutes, description, event_type, report, id_prom } = req.body;

    if (!title && !event_datetime && !duration_minutes && !description && !event_type && !report && !id_prom) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (title, event_datetime, duration minutes, description, event_type, report or id_prom) must be provided'
      });
    }

    const updateData = {};

    if (title) {
        if (title.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Title cannot be empty'
            });
        }

        const { data: existingEvent, error: checkError } = await supabase
            .from('event')
            .select('id')
            .eq('title', title)
            .neq('id', id)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing email:', checkError);
            return res.status(500).json({
                success: false,
                message: 'Failed to check existing title for another event',
                error: checkError.message
            });
        }
    
        if (existingEvent) {
            return res.status(409).json({
                success: false,
                message: 'Title already exists for another event'
            });
        }

        updateData.title = title;
    }

    if (event_datetime) {
        const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}$/;
        if (!dateTimeRegex.test(event_datetime)) {
        return res.status(400).json({
            success: false,
            message:
            "Invalid event_datetime format. Expected format: YYYY-MM-DD HH:mm:ss+00",
        });
        }

  
        updateData.event_datetime = event_datetime;
    }

    if (duration_minutes) {
        if (!Number.isInteger(duration_minutes) || duration_minutes <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Duration minutes must be a positive integer'
            });
        }
        updateData.duration_minutes = duration_minutes;
    }

    if (description) {
        updateData.description = description;
    }

    if (event_type) {
        const allowedTypes = [
            "follow-up",
            "kick-off",
            "keynote",
            "hub-talk",
            "other",
        ];
        if (!allowedTypes.includes(event_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid event type'
            });
        }
        updateData.event_type = event_type;
    }

    if (report) {
        updateData.report = report;
    }

    if (id_prom) {
        updateData.id_prom = id_prom;
    }

    const { data, error } = await supabase
      .from('event')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      console.error('Error updating event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update event',
        error: error.message
      });
    }

    if (data && id_prom) {
        const eventId = data.id;

        await supabase.from('event_student').delete().eq('id_event', eventId);

        const options = {
            hostname: 'localhost',
            port: 3004,
            path: `/students/promotion/${id_prom}`,
            method: 'GET',
        };

        const req = http.request(options, (res) => {
            let studentData = '';
            res.on('data', (chunk) => {
                studentData += chunk;
            });
            res.on('end', async () => {
                if (res.statusCode === 200) {
                    const students = JSON.parse(studentData).data;
                    if (students && students.length > 0) {
                        const studentEventInserts = students.map(student => ({
                            id_student: student.profile.id_user, // Make sure this is the correct student identifier
                            id_event: eventId,
                        }));

                        const { error: insertError } = await supabase
                            .from('event_student')
                            .insert(studentEventInserts);

                        if (insertError) {
                            console.error("Error batch inserting students into event on update:", insertError);
                        }
                    }
                } else {
                     console.error(`Failed to get students from profile-service on update. Status: ${res.statusCode}`);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request to profile-service on update: ${e.message}`);
        });

        req.end();
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
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

// delete an event
/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted
 *       404:
 *         description: Event not found
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID provided'
      });
    }

    // First, delete related records in event_student
    console.log(`[Event Service] Attempting to delete student registrations for event ID: ${eventId}`);
    const { data: deletedStudentData, error: deleteStudentError } = await supabase
      .from('event_student')
      .delete()
      .eq('id_event', eventId)
      .select();

    console.log('[Event Service] Result of deleting from event_student:', { data: deletedStudentData, count: deletedStudentData?.length, error: deleteStudentError });

    if (deleteStudentError) {
      console.error('Error deleting student events:', deleteStudentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete student registrations for the event',
        error: deleteStudentError.message
      });
    }

    const { data: existingUser, error: checkError } = await supabase
      .from('event')
      .select('*')
      .eq('id', eventId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      console.error('Error checking event existence:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check event existence',
        error: checkError.message
      });
    }

    const { error } = await supabase
      .from('event')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
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

module.exports = router;
