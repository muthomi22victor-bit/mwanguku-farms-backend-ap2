require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const galleryRoutes = require('./routes/gallery');
const testimonialRoutes = require('./routes/testimonials');
const contactRoutes = require('./routes/contact');
const orderRoutes = require('./routes/orders');
const statRoutes = require('./routes/stats');

const app = express();

/* -----------------------------------------------------------
   CORS
   CLIENT_URL can be a single origin or a comma-separated list,
   e.g. "https://mwangukufarms.netlify.app,https://mwangukufarms.co.ke"
   If CLIENT_URL is not set, all origins are allowed (useful for
   local development only — always set CLIENT_URL in production).
----------------------------------------------------------- */
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the admin dashboard at /admin
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

/* -----------------------------------------------------------
   API ROUTES
----------------------------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statRoutes);

// Health check — useful for Render's health checks / uptime monitors
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mwanguku Farms API is running',
    dbState: mongoose.connection.readyState, // 1 = connected
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Mwanguku Farms Ltd API — see /api/health for status' });
});

/* -----------------------------------------------------------
   404 + ERROR HANDLING
----------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server',
  });
});

/* -----------------------------------------------------------
   DATABASE + SERVER STARTUP
----------------------------------------------------------- */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Atlas connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
