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
// MONGODB MODELS (ALL IN ONE FILE)
// =============================================

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin', 'manager'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  profileImage: String,
  address: { street: String, city: String, county: String, postalCode: String },
  lastLogin: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getJWTToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const User = mongoose.model('User', userSchema);

// Product Model
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true },
  shortDescription: String,
  price: { type: Number, min: 0 },
  unit: { type: String, enum: ['kg', 'piece', 'tray', 'box', 'bag'], default: 'kg' },
  category: { type: String, enum: ['chicken', 'eggs', 'chicks', 'feeds', 'live-birds'], required: true },
  image: String,
  images: [String],
  inStock: { type: Boolean, default: true },
  stockQuantity: { type: Number, default: 0 },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

// Stat Model
const statSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true },
  value: { type: Number, required: true, default: 0 },
  suffix: { type: String, default: '+' },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

const Stat = mongoose.model('Stat', statSchema);

// =============================================
// MIDDLEWARE (AUTH)
// =============================================

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Role ${req.user.role} is not authorized` });
    }
    next();
  };
};

// =============================================
// API ROUTES (ALL IN ONE FILE)
// =============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Stats Routes
app.get('/api/stats', async (req, res) => {
  try {
    let stats = await Stat.find().sort({ displayOrder: 1 });
    if (stats.length === 0) {
      const defaultStats = [
        { key: 'birds', label: 'Healthy Birds', value: 500, suffix: '+', displayOrder: 0 },
        { key: 'customers', label: 'Satisfied Customers', value: 300, suffix: '+', displayOrder: 1 },
        { key: 'quality', label: 'Quality Products', value: 100, suffix: '%', displayOrder: 2 },
        { key: 'years', label: 'Years of Growth', value: 5, suffix: '+', displayOrder: 3 }
      ];
      await Stat.insertMany(defaultStats);
      stats = await Stat.find().sort({ displayOrder: 1 });
    }
    res.status(200).json({ success: true, count: stats.length, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/stats/:key', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { value } = req.body;
    const stat = await Stat.findOne({ key: req.params.key });
    if (!stat) {
      return res.status(404).json({ success: false, message: 'Stat not found' });
    }
    stat.value = value;
    await stat.save();
    res.status(200).json({ success: true, stat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/products', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/products/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Gallery Routes
app.get('/api/gallery', async (req, res) => {
  try {
    res.status(200).json({ success: true, images: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Testimonial Routes
app.get('/api/testimonials', async (req, res) => {
  try {
    res.status(200).json({ success: true, testimonials: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Contact Routes
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/contact', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    res.status(200).json({ success: true, messages: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    user = new User({ name, email, phone, password });
    await user.save();
    const token = user.getJWTToken();
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = user.getJWTToken();
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// Order Routes (placeholder)
app.post('/api/orders', protect, async (req, res) => {
  res.status(201).json({ success: true, order: { id: Date.now(), ...req.body } });
});

app.get('/api/orders', protect, async (req, res) => {
  res.status(200).json({ success: true, orders: [] });
});

// Admin Dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// =============================================
// CONNECT TO MONGODB AND START
// =============================================

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  // Start even without MongoDB
  app.listen(PORT, () => {
    console.log(`⚠️ Server running WITHOUT MongoDB on port ${PORT}`);
  });
});
