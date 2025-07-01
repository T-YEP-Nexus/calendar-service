const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabaseClient.js");

// crud routes for the 'event-student' table

// get all event-students
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

module.exports = router;
