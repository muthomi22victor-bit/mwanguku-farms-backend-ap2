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
// ROOT ROUTES
// =============================================

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

// Gallery Model
const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  image: { type: String, required: true },
  thumbnail: String,
  category: { type: String, enum: ['farm', 'flocks', 'facilities', 'products', 'team', 'events'], default: 'farm' },
  tags: [String],
  featured: { type: Boolean, default: false },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  views: { type: Number, default: 0 }
}, { timestamps: true });

const Gallery = mongoose.model('Gallery', gallerySchema);

// Testimonial Model
const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  position: String,
  company: String,
  rating: { type: Number, min: 1, max: 5, default: 5 },
  avatar: String,
  isApproved: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  source: { type: String, enum: ['website', 'facebook', 'google', 'email'], default: 'website' }
}, { timestamps: true });

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

// Contact Message Model
const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  subject: String,
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'replied', 'archived'], default: 'new' },
  source: { type: String, enum: ['contact', 'order', 'newsletter', 'other'], default: 'contact' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  repliedAt: Date,
  replyMessage: String
}, { timestamps: true });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

// Order Model
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  quantity: { type: Number, required: true, min: 1 },
  price: Number,
  subtotal: Number
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { street: String, city: { type: String, required: true }, county: String, postalCode: String, landmark: String },
    notes: String
  },
  items: [orderItemSchema],
  subtotal: Number,
  deliveryFee: { type: Number, default: 0 },
  total: Number,
  status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['mpesa', 'bank', 'cash', 'card'], default: 'cash' },
  paymentReference: String,
  deliveryDate: Date,
  deliverySlot: { type: String, enum: ['morning', 'afternoon', 'evening'] },
  notes: String
}, { timestamps: true });

orderSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = new Date();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `MF${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

// =============================================
// MIDDLEWARE
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
// UPLOAD MIDDLEWARE
// =============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/';
    if (file.fieldname === 'product') folder = 'uploads/products/';
    else if (file.fieldname === 'gallery') folder = 'uploads/gallery/';
    else if (file.fieldname === 'avatar') folder = 'uploads/avatars/';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// =============================================
// API ROUTES
// =============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
    const { featured, category, inStock } = req.query;
    const filter = {};
    if (featured === 'true') filter.featured = true;
    if (category) filter.category = category;
    if (inStock === 'true') filter.inStock = true;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/products', protect, authorize('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    const productData = req.body;
    if (req.file) {
      productData.image = `/uploads/products/${req.file.filename}`;
    }
    const product = await Product.create(productData);
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/products/:id', protect, authorize('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const updateData = req.body;
    if (req.file) {
      updateData.image = `/uploads/products/${req.file.filename}`;
    }
    product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, product });
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
    const { category, featured } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    const images = await Gallery.find(filter).populate('uploader', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: images.length, images });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/gallery', protect, authorize('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    const image = await Gallery.create({
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      image: `/uploads/gallery/${req.file.filename}`,
      uploader: req.user._id
    });
    res.status(201).json({ success: true, image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/gallery/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    await image.deleteOne();
    res.status(200).json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Testimonial Routes
app.get('/api/testimonials', async (req, res) => {
  try {
    const { featured } = req.query;
    const filter = { isApproved: true };
    if (featured === 'true') filter.featured = true;
    const testimonials = await Testimonial.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: testimonials.length, testimonials });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/testimonials', async (req, res) => {
  try {
    const { name, content, position, company, rating } = req.body;
    const testimonial = await Testimonial.create({ name, content, position, company, rating: rating || 5 });
    res.status(201).json({ success: true, message: 'Testimonial submitted for approval', testimonial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/testimonials/all', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: testimonials.length, testimonials });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/testimonials/:id/approve', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    testimonial.isApproved = true;
    await testimonial.save();
    res.status(200).json({ success: true, message: 'Testimonial approved', testimonial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Contact Routes
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const contactMessage = await ContactMessage.create({ name, email, phone, subject, message });
    res.status(201).json({ success: true, message: 'Message sent successfully', contact: contactMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/contact', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const messages = await ContactMessage.find(filter).populate('assignedTo', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/contact/:id/status', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const message = await ContactMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    message.status = status;
    if (status === 'read' && !message.repliedAt) {
      message.repliedAt = new Date();
    }
    await message.save();
    res.status(200).json({ success: true, message: 'Status updated', contact: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Order Routes
app.post('/api/orders', protect, async (req, res) => {
  try {
    const { customer, items, deliveryFee, paymentMethod, deliverySlot, notes } = req.body;
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemTotal
      });
    }
    const total = subtotal + (deliveryFee || 0);
    const order = await Order.create({
      user: req.user._id,
      customer: {
        name: customer.name || req.user.name,
        email: customer.email || req.user.email,
        phone: customer.phone || req.user.phone,
        address: customer.address
      },
      items: orderItems,
      subtotal,
      deliveryFee: deliveryFee || 0,
      total,
      paymentMethod: paymentMethod || 'cash',
      deliverySlot,
      notes
    });
    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/orders', protect, async (req, res) => {
  try {
    let query = {};
    if (!(req.user.role === 'admin' || req.user.role === 'manager')) {
      query.user = req.user._id;
    }
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/orders/:id/status', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.status = status;
    await order.save();
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================
// START SERVER
// =============================================

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
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
