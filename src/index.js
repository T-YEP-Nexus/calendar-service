const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const eventRoutes = require("./routes/event/event.js");
const eventMiscRoutes = require("./routes/event/misc/misc.js");

const eventStudentRoutes = require("./routes/eventStudents/event-student.js");
const eventStudentMiscRoutes = require("./routes/eventStudents/misc/misc.js");

app.use(auth);

app.use("", eventRoutes);
app.use("", eventMiscRoutes);
app.use("", eventStudentRoutes);
app.use("", eventStudentMiscRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
