const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Products (hardcoded)
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: [
      { id: 1, name: 'Whole Chicken', price: 1200, category: 'chicken' },
      { id: 2, name: 'Fresh Eggs', price: 450, category: 'eggs' },
      { id: 3, name: 'Broilers', price: 1500, category: 'chicken' }
    ]
  });
});

// Stats (hardcoded)
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: [
      { key: 'birds', label: 'Healthy Birds', value: 500, suffix: '+' },
      { key: 'customers', label: 'Satisfied Customers', value: 300, suffix: '+' }
    ]
  });
});

// Contact form (saves in memory)
let messages = [];
app.post('/api/contact', (req, res) => {
  const { name, email, phone, message } = req.body;
  messages.push({ id: Date.now(), name, email, phone, message, date: new Date() });
  res.json({ success: true, message: 'Message sent!' });
});

app.get('/api/contact', (req, res) => {
  res.json({ success: true, messages });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@mwangukufarms.co.ke' && password === 'SecureAdmin2026') {
    res.json({ success: true, token: 'fake-token', user: { name: 'Admin', email: 'admin@mwangukufarms.co.ke', role: 'admin' } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
