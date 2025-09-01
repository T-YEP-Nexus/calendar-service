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
      // PGRST116 means no rows found, which is a valid 404 case.
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

    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/; // ISO String format
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
          target_promotions: target_promotions || [],
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

    // Assign students using the helper function
    if (data) {
      await assignStudentsToEvent(data.id, target_promotions);
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

// Helper function to assign students to an event
async function assignStudentsToEvent(eventId, targetPromotions) {
  if (!targetPromotions || targetPromotions.length === 0) {
    console.log(`[Event Service] No target promotions for event ${eventId}, skipping student assignment.`);
    return;
  }

  console.log(`[Event Service] Assigning students to event ${eventId} from promotions: ${targetPromotions.join(', ')}`);

  for (const promotionId of targetPromotions) {
    try {
      const students = await getStudentsByPromotion(promotionId);

      if (students && students.length > 0) {
        const studentEventInserts = students.map(student => ({
          id_student: student.profile.id_user,
          id_event: eventId,
        }));

        console.log(`[Event Service] Preparing to insert ${studentEventInserts.length} students for promotion ${promotionId}.`);

        const { error: insertError } = await supabase
          .from('event_student')
          .insert(studentEventInserts, { onConflict: ['id_student', 'id_event'] }); // Ignore duplicates

        if (insertError) {
          console.error(`[Event Service] Error batch inserting students for promotion ${promotionId}:`, insertError);
        } else {
          console.log(`[Event Service] Successfully processed ${studentEventInserts.length} students for promotion ${promotionId}.`);
        }
      } else {
        console.log(`[Event Service] No students found for promotion ${promotionId}.`);
      }
    } catch (error) {
      console.error(`[Event Service] Failed to process promotion ${promotionId}:`, error);
    }
  }
}

// Helper function to fetch students from profile-service
function getStudentsByPromotion(promotionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: `/students/promotion/${promotionId}`,
      method: 'GET',
    };

    console.log(`[Event Service] Calling profile-service for promotion ${promotionId}`);

    const req = http.request(options, (res) => {
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
           // Resolve with empty array to not block other promotions
           resolve([]);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[Event Service] Request to profile-service failed: ${e.message}`);
      reject(e);
    });

    req.end();
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
      // NOUVELLES COLONNES :
      location,
      slot_duration,
      allow_multiple_users,
      target_promotions,
      // AJOUTER SLOTS :
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
        const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/; // ISO String format
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

    // GESTION DES NOUVELLES COLONNES :
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

    // AJOUTER LA GESTION DES SLOTS :
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

    if (data && target_promotions && target_promotions.length > 0) {
        const eventId = data.id;

        console.log(`[Event Service] Event ${eventId} updated. Now updating student assignments.`);

        // Supprimer toutes les anciennes assignations d'étudiants pour cet événement
        const { error: deleteError } = await supabase.from('event_student').delete().eq('id_event', eventId);
        if (deleteError) {
            console.error(`[Event Service] Failed to delete old assignments for event ${eventId}:`, deleteError);
            // We can decide to continue or to stop. For now, let's continue.
        }

        // Assigner les nouveaux étudiants en utilisant la fonction helper
        await assignStudentsToEvent(eventId, target_promotions);
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

    // Supabase will handle cascade delete if configured in the database schema.
    // If not, manual deletion is required. Let's ensure manual deletion is robust.

    // 1. Delete related records in event_student
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

    // 2. Delete the event itself
    const { data: deletedEvent, error: deleteEventError } = await supabase
      .from('event')
      .delete()
      .eq('id', eventId)
      .select()
      .single();

    if (deleteEventError) {
      if (deleteEventError.code === 'PGRST116') { // No event found to delete
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

// get events for a specific student
/**
 * @swagger
 * /events/student/{studentId}:
 *   get:
 *     summary: Get all events for a specific student
 *     tags: [Events]
 *     parameters:
 *       - name: studentId
 *         in: path
 *         required: true
 *         description: Student UUID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       400:
 *         description: Invalid student ID
 *       404:
 *         description: No events found for this student
 */
router.get("/events/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // Valider que l'ID de l'étudiant est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!studentId || !uuidRegex.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID provided",
      });
    }

    // Récupérer tous les événements auxquels l'étudiant est inscrit
    const { data, error } = await supabase
      .from("event_student")
      .select(`
        id_event,
        event:event(
          id,
          title,
          event_datetime,
          duration_minutes,
          description,
          event_type,
          location,
          slot_duration,
          allow_multiple_users,
          target_promotions,
          slots
        )
      `)
      .eq("id_student", studentId);

    if (error) {
      console.error("Error fetching student events:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch student events",
        error: error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No events found for this student",
        data: [],
      });
    }

    // Formater les données pour le frontend
    const formattedEvents = data.map(item => ({
      id: item.event.id,
      title: item.event.title,
      // Source de vérité attendue par le frontend
      event_datetime: item.event.event_datetime,
      duration_minutes: item.event.duration_minutes,
      // Compatibilité (le frontend n'en dépend plus mais on les expose)
      start: item.event.event_datetime,
      end: new Date(new Date(item.event.event_datetime).getTime() + item.event.duration_minutes * 60000).toISOString(),
      description: item.event.description,
      event_type: item.event.event_type,
      location: item.event.location,
      slot_duration: item.event.slot_duration,
      allow_multiple_users: item.event.allow_multiple_users,
      target_promotions: item.event.target_promotions,
      slots: item.event.slots,
      registration_id: item.id
    }));

    res.status(200).json({
      success: true,
      message: "Student events retrieved successfully",
      data: formattedEvents,
      count: formattedEvents.length,
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

// Register a student to a specific slot
/**
 * @swagger
 * /events/{eventId}/slots/{slotIndex}/register:
 *   post:
 *     summary: Register a student to a specific slot
 *     tags: [Events]
 *     parameters:
 *       - name: eventId
 *         in: path
 *         required: true
 *         description: Event ID
 *         schema:
 *           type: integer
 *       - name: slotIndex
 *         in: path
 *         required: true
 *         description: Slot index
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_student
 *             properties:
 *               id_student:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student registered to slot successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Event or slot not found
 *       409:
 *         description: Slot already taken
 */
router.post("/events/:eventId/slots/:slotIndex/register", async (req, res) => {
  try {
    const { eventId, slotIndex } = req.params;
    const { id_student } = req.body;
    
    const eventIdInt = parseInt(eventId, 10);
    const slotIndexInt = parseInt(slotIndex, 10);
    
    if (isNaN(eventIdInt) || isNaN(slotIndexInt)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID or slot index provided",
      });
    }
    
    if (!id_student) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }
    
    // Vérifier que l'événement existe et récupérer ses slots
    const { data: event, error: eventError } = await supabase
      .from("event")
      .select("id, title, slots")
      .eq("id", eventIdInt)
      .single();
      
    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
    
    // Vérifier que le slot existe
    if (!event.slots || !Array.isArray(event.slots) || slotIndexInt >= event.slots.length) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }
    
    // Vérifier que le slot n'est pas déjà occupé
    if (event.slots[slotIndexInt].user) {
      return res.status(409).json({
        success: false,
        message: "Slot already taken",
      });
    }
    
    // Vérifier que l'étudiant n'a pas déjà un autre slot dans cet événement
    const existingSlotIndex = event.slots.findIndex(slot => slot.user === id_student);
    if (existingSlotIndex >= 0) {
      return res.status(409).json({
        success: false,
        message: "Student already has a slot in this event",
      });
    }
    
    // Mettre à jour le slot avec l'ID de l'étudiant
    const updatedSlots = [...event.slots];
    updatedSlots[slotIndexInt] = {
      ...updatedSlots[slotIndexInt],
      user: id_student
    };
    
    // Sauvegarder dans la base de données
    const { data: updatedEvent, error: updateError } = await supabase
      .from("event")
      .update({ slots: updatedSlots })
      .eq("id", eventIdInt)
      .select()
      .single();
      
    if (updateError) {
      console.error("Error updating event slots:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to register student to slot",
        error: updateError.message,
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Student registered to slot successfully",
      data: {
        event_id: eventIdInt,
        slot_index: slotIndexInt,
        student_id: id_student,
        updated_slots: updatedEvent.slots
      },
    });
    
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
      error: err.message,
    });
  }
});

// Unregister a student from a specific slot
/**
 * @swagger
 * /events/{eventId}/slots/{slotIndex}/unregister:
 *   delete:
 *     summary: Unregister a student from a specific slot
 *     tags: [Events]
 *     parameters:
 *       - name: eventId
 *         in: path
 *         required: true
 *         description: Event ID
 *         schema:
 *           type: integer
 *       - name: slotIndex
 *         in: path
 *         required: true
 *         description: Slot index
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_student
 *             properties:
 *               id_student:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student unregistered from slot successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Event or slot not found
 *       403:
 *         description: Student not registered to this slot
 */
router.delete("/events/:eventId/slots/:slotIndex/unregister", async (req, res) => {
  try {
    const { eventId, slotIndex } = req.params;
    const { id_student } = req.body;
    
    const eventIdInt = parseInt(eventId, 10);
    const slotIndexInt = parseInt(slotIndex, 10);
    
    if (isNaN(eventIdInt) || isNaN(slotIndexInt)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID or slot index provided",
      });
    }
    
    if (!id_student) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }
    
    // Vérifier que l'événement existe et récupérer ses slots
    const { data: event, error: eventError } = await supabase
      .from("event")
      .select("id, title, slots")
      .eq("id", eventIdInt)
      .single();
      
    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
    
    // Vérifier que le slot existe
    if (!event.slots || !Array.isArray(event.slots) || slotIndexInt >= event.slots.length) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }
    
    // Vérifier que l'étudiant est bien inscrit à ce slot
    if (event.slots[slotIndexInt].user !== id_student) {
      return res.status(403).json({
        success: false,
        message: "Student is not registered to this slot",
      });
    }
    
    // Libérer le slot
    const updatedSlots = [...event.slots];
    updatedSlots[slotIndexInt] = {
      ...updatedSlots[slotIndexInt],
      user: null
    };
    
    // Sauvegarder dans la base de données
    const { data: updatedEvent, error: updateError } = await supabase
      .from("event")
      .update({ slots: updatedSlots })
      .eq("id", eventIdInt)
      .select()
      .single();
      
    if (updateError) {
      console.error("Error updating event slots:", updateError);
      return res.status(500).json({
        success: false,
        message: "Failed to unregister student from slot",
        error: updateError.message,
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Student unregistered from slot successfully",
      data: {
        event_id: eventIdInt,
        slot_index: slotIndexInt,
        student_id: id_student,
        updated_slots: updatedEvent.slots
      },
    });
    
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
      error: err.message,
    });
  }
});

// get all students registered for a specific event
/**
 * @swagger
 * /events/{eventId}/students:
 *   get:
 *     summary: Get all students registered for a specific event
 *     tags: [Events]
 *     parameters:
 *       - name: eventId
 *         in: path
 *         required: true
 *         description: Event ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *       400:
 *         description: Invalid event ID
 *       404:
 *         description: Event not found
 */
router.get("/events/:eventId/students", async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventIdInt = parseInt(eventId, 10);

    if (isNaN(eventIdInt)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID provided",
      });
    }

    // Vérifier que l'événement existe
    const { data: existingEvent, error: eventCheckError } = await supabase
      .from("event")
      .select("id, title")
      .eq("id", eventIdInt)
      .single();

    if (eventCheckError || !existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Récupérer tous les étudiants inscrits à cet événement
    const { data, error } = await supabase
      .from("event_student")
      .select(`
        id,
        id_student,
        created_at,
        student:student(
          id,
          student_number,
          major,
          profile:user-profile(
            id,
            first_name,
            last_name,
            email:user(email)
          )
        )
      `)
      .eq("id_event", eventIdInt);

    if (error) {
      console.error("Error fetching event students:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch event students",
        error: error.message,
      });
    }

    // Formater les données pour le frontend
    const formattedStudents = data.map(item => ({
      registration_id: item.id,
      student_id: item.id_student,
      registered_at: item.created_at,
      student: {
        id: item.student.id,
        student_number: item.student.student_number,
        major: item.student.major,
        profile: {
          id: item.student.profile.id,
          first_name: item.student.profile.first_name,
          last_name: item.student.profile.last_name,
          email: item.student.profile.email
        }
      }
    }));

    res.status(200).json({
      success: true,
      message: "Event students retrieved successfully",
      data: {
        event: {
          id: existingEvent.id,
          title: existingEvent.title
        },
        students: formattedStudents,
        count: formattedStudents.length
      }
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

// (route dupliquée supprimée)

module.exports = router;
