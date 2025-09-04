const express = require("express");
const router = express.Router();
const supabase = require("../../../config/supabaseClient.js");
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
      if (error.code === "PGRST116") {
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
      id_prom,
      target_promotions
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

    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    if (!dateTimeRegex.test(event_datetime)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid event_datetime format. Expected ISO format: YYYY-MM-DDTHH:mm:ss.sssZ",
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
          location: req.body.location || null,
          slot_duration: req.body.slot_duration || 30,
          allow_multiple_users: req.body.allow_multiple_users || false,
          target_promotions: target_promotions,
          slots: req.body.slots || [],
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

    if (data) {
      console.log(`[Event Service] Created event ${data.id}, now assigning students...`);
      console.log(`[Event Service] target_promotions value:`, target_promotions);
      try {
        await assignStudentsToEvent(data.id, target_promotions, req);
        console.log(`[Event Service] Student assignment completed for event ${data.id}`);
      } catch (error) {
        console.error(`[Event Service] Error during student assignment:`, error);
      }
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

async function assignStudentsToEvent(eventId, targetPromotions, req) {
  console.log(`[Event Service] Assigning students to event ${eventId}...`);
  
  try {
    let students = [];
    
    if (targetPromotions === null || targetPromotions === undefined || (Array.isArray(targetPromotions) && targetPromotions.length === 0)) {
      console.log(`[Event Service] Event ${eventId} is for all students.`);
      console.log(`[Event Service] Calling getAllActiveStudents...`);
      students = await getAllActiveStudents(req);
      console.log(`[Event Service] getAllActiveStudents returned ${students?.length || 0} students`);
    }
    else if (targetPromotions && targetPromotions.length > 0) {
      console.log(`[Event Service] Event ${eventId} is for specific promotions: ${targetPromotions.join(', ')}`);
      
      for (const promotionId of targetPromotions) {
        try {
          const promotionStudents = await getStudentsByPromotion(promotionId, req);
          if (promotionStudents && promotionStudents.length > 0) {
            students = students.concat(promotionStudents);
            console.log(`[Event Service] Found ${promotionStudents.length} students in promotion ${promotionId}`);
          }
        } catch (error) {
          console.error(`[Event Service] Error fetching students for promotion ${promotionId}:`, error);
        }
      }
    }
    else {
      console.log(`[Event Service] Unexpected target_promotions value for event ${eventId}:`, targetPromotions);
      return;
    }

    if (students && students.length > 0) {
      console.log(`[Event Service] Sample student data structure:`, JSON.stringify(students[0], null, 2));
      
      const studentEventInserts = [];
      
      for (const student of students) {
        try {
          let studentUuid = null;

          if (student.id_user) {
            studentUuid = student.id_user;
            console.log(`[Event Service] Direct UUID from user-profile: ${studentUuid}`);
          }
          else if (student.id_user_profile) {
            const profileData = await getProfileById(student.id_user_profile, req);
            if (profileData && profileData.id_user) {
              studentUuid = profileData.id_user;
              console.log(`[Event Service] Found UUID via profile lookup ${student.id_user_profile}: ${studentUuid}`);
            }
          }

          if (studentUuid) {
            studentEventInserts.push({
              id_student: studentUuid,
              id_event: eventId,
            });
          } else {
            console.error(`[Event Service] Could not find UUID for student:`, student);
          }
        } catch (error) {
          console.error(`[Event Service] Error processing student:`, error);
        }
      }

      if (studentEventInserts.length > 0) {
        const existingAssignments = [];
        for (const insert of studentEventInserts) {
          const { data: existing } = await supabase
            .from('event_student')
            .select('id')
            .eq('id_student', insert.id_student)
            .eq('id_event', insert.id_event)
            .single();
          
          if (!existing) {
            existingAssignments.push(insert);
          }
        }

        if (existingAssignments.length > 0) {
          const { error: insertError } = await supabase
            .from('event_student')
            .insert(existingAssignments);

          if (insertError) {
            console.error(`[Event Service] Error inserting students for event ${eventId}:`, insertError);
          } else {
            console.log(`[Event Service] Successfully assigned event ${eventId} to ${existingAssignments.length} new students.`);
          }
        } else {
          console.log(`[Event Service] All students already assigned to event ${eventId}.`);
        }
      } else {
        console.log(`[Event Service] No valid students found for event ${eventId}.`);
      }
    } else {
      console.log(`[Event Service] No students found for event ${eventId}.`);
    }
    
  } catch (error) {
    console.error(`[Event Service] Failed to assign students to event ${eventId}:`, error);
  }
}

function getProfileById(profileId, req) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'profile-service',
      port: 3004,
      path: `/profile/${profileId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
    };

    const httpReq = http.request(options, (res) => {
      let profileData = '';
      res.on('data', (chunk) => {
        profileData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(profileData);
            resolve(parsedData.data || null);
          } catch (e) {
            console.error("[Event Service] Error parsing JSON from profile-service (profile):", e);
            reject(new Error("Invalid JSON response from profile-service"));
          }
        } else {
           console.error(`[Event Service] Profile-service (profile) returned status ${res.statusCode}: ${profileData}`);
           resolve(null);
        }
      });
    });

    httpReq.on('error', (e) => {
      console.error(`[Event Service] Request to profile-service (profile) failed: ${e.message}`);
      reject(e);
    });

    httpReq.end();
  });
}

function getStudentsByPromotion(promotionId, req) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'profile-service',
      port: 3004,
      path: `/students/promotion/${promotionId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '', 
      },
    };

    console.log(`[Event Service] Calling profile-service for promotion ${promotionId}`);

    const httpReq = http.request(options, (res) => {
      let studentData = '';
      res.on('data', (chunk) => {
        studentData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsedData = JSON.parse(studentData);
            resolve(parsedData.data || []);
          } catch (e) {
            console.error("[Event Service] Error parsing JSON from profile-service:", e);
            reject(new Error("Invalid JSON response from profile-service"));
          }
        } else {
           console.error(`[Event Service] Profile-service returned status ${res.statusCode}: ${studentData}`);
           resolve([]);
        }
      });
    });

    httpReq.on('error', (e) => {
      console.error(`[Event Service] Request to profile-service failed: ${e.message}`);
      reject(e);
    });

    httpReq.end();
  });
}

function getAllActiveStudents(req) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'profile-service',
      port: 3004,
      path: `/students/active`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers?.cookie || '',
      },
    };

    console.log(`[Event Service] Calling profile-service at http://localhost:3004/students/active`);
    console.log(`[Event Service] Request headers:`, options.headers);

    try {
      const httpReq = http.request(options, (res) => {
        let studentData = '';
        res.on('data', (chunk) => {
          studentData += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsedData = JSON.parse(studentData);
              console.log(`[Event Service] Profile-service returned ${parsedData.data?.length || 0} active students`);
              resolve(parsedData.data || []);
            } catch (e) {
              console.error("[Event Service] Error parsing JSON from profile-service (all students):", e);
              console.error("[Event Service] Raw data:", studentData);
              resolve([]);
            }
          } else {
             console.error(`[Event Service] Profile-service (all students) returned status ${res.statusCode}: ${studentData}`);
             resolve([]);
          }
        });
      });

      httpReq.on('error', (e) => {
        console.error(`[Event Service] Request to profile-service (all students) failed: ${e.message}`);
        console.error(`[Event Service] Error details:`, e);
        resolve([]); 
      });

      httpReq.end();
    } catch (error) {
      console.error(`[Event Service] Unexpected error in getAllActiveStudents:`, error);
      resolve([]);
    }
  });
}

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
    const { 
      title, 
      event_datetime, 
      duration_minutes, 
      description, 
      event_type, 
      report, 
      id_prom,
      location,
      slot_duration,
      allow_multiple_users,
      target_promotions,
      slots
    } = req.body;

    if (!title && !event_datetime && !duration_minutes && !description && !event_type && !report && !id_prom &&
        location === undefined && slot_duration === undefined && allow_multiple_users === undefined && 
        target_promotions === undefined && slots === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided'
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
        const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/; 
        if (!dateTimeRegex.test(event_datetime)) {
        return res.status(400).json({
            success: false,
            message:
            "Invalid event_datetime format. Expected ISO format: YYYY-MM-DDTHH:mm:ss.sssZ",
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

    if (location !== undefined) {
        updateData.location = location;
    }

    if (slot_duration !== undefined) {
        if (!Number.isInteger(slot_duration) || slot_duration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Slot duration must be a positive integer'
            });
        }
        updateData.slot_duration = slot_duration;
    }

    if (allow_multiple_users !== undefined) {
        updateData.allow_multiple_users = allow_multiple_users;
    }

    if (target_promotions !== undefined) {
        updateData.target_promotions = target_promotions;
    }

    if (slots !== undefined) {
        updateData.slots = slots;
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

    if (data && target_promotions !== undefined) {
        const eventId = data.id;

        console.log(`[Event Service] Event ${eventId} updated. Now updating student assignments.`);
        console.log(`[Event Service] New target_promotions:`, target_promotions);

        const { error: deleteError } = await supabase.from('event_student').delete().eq('id_event', eventId);
        if (deleteError) {
            console.error(`[Event Service] Failed to delete old assignments for event ${eventId}:`, deleteError);
        } else {
            console.log(`[Event Service] Deleted old assignments for event ${eventId}`);
        }
        await assignStudentsToEvent(eventId, target_promotions, req);
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

    const { error: deleteStudentError } = await supabase
      .from('event_student')
      .delete()
      .eq('id_event', eventId);
    
    if (deleteStudentError) {
      console.error('Error deleting student registrations:', deleteStudentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete student registrations for the event',
        error: deleteStudentError.message
      });
    }

    const { data: deletedEvent, error: deleteEventError } = await supabase
      .from('event')
      .delete()
      .eq('id', eventId)
      .select()
      .single();

    if (deleteEventError) {
      if (deleteEventError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      console.error('Error deleting event:', deleteEventError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: deleteEventError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event and associated registrations deleted successfully',
      data: {
        deletedEvent
      }
    });

  } catch (err) {
    console.error('Unexpected error during event deletion:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
});


module.exports = router;
