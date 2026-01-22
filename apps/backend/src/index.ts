import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error-handling';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// Phase 2: Routes are defined but return NOT_IMPLEMENTED
// Implementation will happen in Phase 4

// Agent APIs (Execution Plane)
import agentRoutes from './api/agent/routes';
app.use('/agent', agentRoutes);

// Dashboard APIs (Control Plane)
import dashboardRoutes from './api/dashboard/routes';
app.use('/', dashboardRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    errorCode: 'RESOURCE_NOT_FOUND',
    message: 'Resource not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

