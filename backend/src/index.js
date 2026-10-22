import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neosRouter, { handleRiskScore } from './routes/neos.js';
import visibilityRouter from './routes/visibility.js';
import authRouter from './routes/auth.js';
import watchlistRouter from './routes/watchlist.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NEO Watch Node/Express Backend',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/neos', neosRouter);
app.use('/api/visibility', visibilityRouter);

// Support both /api/risk-score/:id and /api/neos/:id/risk-score per architecture.md
app.get('/api/risk-score/:id', handleRiskScore);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[Backend] Server listening on http://localhost:${PORT}`);
});

export default app;
