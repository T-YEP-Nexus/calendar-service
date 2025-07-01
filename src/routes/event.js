const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabaseClient.js");

// crud routes for the 'event' table

// get all events
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

// get a user by id
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
      .single();

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

// // update a user's password or email
router.patch('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, event_datetime, duration_minutes, description, event_type, report } = req.body;

    if (!title && !event_datetime && !duration_minutes && !description && !event_type && !report) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (title, event_datetime, duration minutes, description, event_type or report) must be provided'
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

        const eventDateTime = new Date(event_datetime);
        const currentDateTime = new Date();
        if (eventDateTime < currentDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Event datetime cannot be in the past'
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

// delete a user
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingUser, error: checkError } = await supabase
      .from('event')
      .select('*')
      .eq('id', id)
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
      .eq('id', id);

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
