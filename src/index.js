const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

const eventRoutes = require('./routes/event');
const eventStudentRoutes = require('./routes/event-student');

app.use('', eventRoutes)
app.use('', eventStudentRoutes)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});