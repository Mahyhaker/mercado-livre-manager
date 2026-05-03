const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Mercado Livre Manager rodando 🚀');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);

// IMPORTANTE: sempre no final
app.use(errorHandler);

module.exports = app;