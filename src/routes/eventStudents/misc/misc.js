const express = require("express");
const router = express.Router();
const supabase = require("../../../../config/supabaseClient.js");

// crud routes for the 'event-student' table
/**
 * @swagger
 * tags:
 *   name: EventStudents/Misc
 *   description: Student assignments to events misc
 */


// get full agenda for a student $
/**
 * @swagger
 * /agenda/student/{id_student}:
 *   get:
 *     summary: Get all event details for a student's agenda
 *     tags: [EventStudents/Misc]
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

    const eventIds = studentEvents.map((se) => se.id_event);

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

// get an event-students by student id $
/**
 * @swagger
 * /event-students/student/{id_student}:
 *   get:
 *     summary: Get all events assigned to a student
 *     tags: [EventStudents/Misc]
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

module.exports = router;
