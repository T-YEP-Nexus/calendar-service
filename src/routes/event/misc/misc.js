const express = require("express");
const router = express.Router();
const supabase = require("../../../../config/supabaseClient.js");
const http = require('http');

// crud routes for the 'event' table
/**
 * @swagger
 * tags:
 *   name: Events/Misc
 *   description: Event management misc
 */


// get events for a specific student $
/**
 * @swagger
 * /events/student/{studentId}:
 *   get:
 *     summary: Get all events for a specific student
 *     tags: [Events/Misc]
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!studentId || !uuidRegex.test(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID provided",
      });
    }

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

    const formattedEvents = data.map(item => ({
      id: item.event.id,
      title: item.event.title,
      event_datetime: item.event.event_datetime,
      duration_minutes: item.event.duration_minutes,
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

// Register a student to a specific slot $
/**
 * @swagger
 * /events/{eventId}/slots/{slotIndex}/register:
 *   post:
 *     summary: Register a student to a specific slot
 *     tags: [Events/Misc]
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
    
    const { data: event, error: eventError } = await supabase
      .from("event")
      .select("id, title, slots, allow_multiple_users")
      .eq("id", eventIdInt)
      .single();
      
    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
    
    if (!event.slots || !Array.isArray(event.slots) || slotIndexInt >= event.slots.length) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }
    
    const slot = event.slots[slotIndexInt];
    const maxUsers = slot.maxUsers || 1;
    const currentUsers = slot.currentUsers || 0;
    
    // Vérifier si le créneau est complet
    if (currentUsers >= maxUsers) {
      return res.status(409).json({
        success: false,
        message: "Slot is full",
      });
    }
    
    // Si allow_multiple_users est false, vérifier qu'aucun utilisateur n'est déjà inscrit
    if (!event.allow_multiple_users && slot.user) {
      return res.status(409).json({
        success: false,
        message: "Slot already taken",
      });
    }
    
    // Vérifier si l'étudiant est déjà inscrit à un créneau de cet événement
    const existingSlotIndex = event.slots.findIndex(slot => slot.user === id_student);
    if (existingSlotIndex >= 0) {
      return res.status(409).json({
        success: false,
        message: "Student already has a slot in this event",
      });
    }
    
    const updatedSlots = [...event.slots];
    updatedSlots[slotIndexInt] = {
      ...updatedSlots[slotIndexInt],
      user: id_student,
      currentUsers: (updatedSlots[slotIndexInt].currentUsers || 0) + 1
    };
    
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

// Unregister a student from a specific slot $
/**
 * @swagger
 * /events/{eventId}/slots/{slotIndex}/unregister:
 *   delete:
 *     summary: Unregister a student from a specific slot
 *     tags: [Events/Misc]
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
    
    const { data: event, error: eventError } = await supabase
      .from("event")
      .select("id, title, slots, allow_multiple_users")
      .eq("id", eventIdInt)
      .single();
      
    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
    
    if (!event.slots || !Array.isArray(event.slots) || slotIndexInt >= event.slots.length) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }
    
    const slot = event.slots[slotIndexInt];
    
    // Pour les créneaux avec un seul utilisateur, vérifier que c'est le bon utilisateur
    if (!event.allow_multiple_users && slot.user !== id_student) {
      return res.status(403).json({
        success: false,
        message: "Student is not registered to this slot",
      });
    }
    
    // Pour les créneaux avec plusieurs utilisateurs, vérifier que l'utilisateur est dans la liste
    if (event.allow_multiple_users) {
      // Dans ce cas, on utilise un système différent - on stocke les utilisateurs dans un array
      // Pour l'instant, on garde la logique simple avec user
      if (slot.user !== id_student) {
        return res.status(403).json({
          success: false,
          message: "Student is not registered to this slot",
        });
      }
    }
    
    const updatedSlots = [...event.slots];
    updatedSlots[slotIndexInt] = {
      ...updatedSlots[slotIndexInt],
      user: null,
      currentUsers: Math.max((updatedSlots[slotIndexInt].currentUsers || 1) - 1, 0)
    };
    
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

// get all students registered for a specific event $
/**
 * @swagger
 * /events/{eventId}/students:
 *   get:
 *     summary: Get all students registered for a specific event
 *     tags: [Events/Misc]
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

    const { data, error } = await supabase
      .from("event_student")
      .select(`
        id,
        id_student,
        created_at
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

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No students registered for this event",
        data: [],
      });
    }

    const formattedStudents = data.map(item => ({
      registration_id: item.id,
      student_id: item.id_student,
      registered_at: item.created_at
    }));

    res.status(200).json({
      success: true,
      message: "Event students retrieved successfully",
      data: formattedStudents,
      event: {
        id: existingEvent.id,
        title: existingEvent.title
      },
      count: formattedStudents.length
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

// get an event by type $
/**
 * @swagger
 * /events/type/{type}:
 *   get:
 *     summary: Get events by type
 *     tags: [Events/Misc]
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


module.exports = router;
