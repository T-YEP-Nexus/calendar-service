const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabaseClient.js");

/**
 * @swagger
 * tags:
 *   name: Agenda
 *   description: Agenda specific endpoints
 */

/**
 * @swagger
 * /agenda/student/{id_student}:
 *   get:
 *     summary: Get all event details for a student's agenda
 *     tags: [Agenda]
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
 */
router.get("/student/:id_student", async (req, res) => {
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