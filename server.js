const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// =============================================
// ROOT ROUTES - ADD THESE!
// =============================================

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Mwanguku Farms API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      gallery: '/api/gallery',
      stats: '/api/stats',
      testimonials: '/api/testimonials',
      contact: '/api/contact',
      orders: '/api/orders',
      auth: '/api/auth',
      admin: '/admin'
    }
  });
});

// API root
app.get('/api', (req, res) => {
  res.json({
    message: 'Mwanguku Farms API',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      gallery: '/api/gallery',
      stats: '/api/stats',
      testimonials: '/api/testimonials',
      contact: '/api/contact',
      orders: '/api/orders',
      auth: '/api/auth',
      admin: '/admin'
    }
  });
});

// =============================================
// MONGODB MODELS
// =============================================
// ... rest of your code continues here
