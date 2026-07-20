/**
 * seed.js
 * Populates a fresh MongoDB Atlas database with:
 *   - one admin user (from ADMIN_* env vars)
 *   - the four homepage stats
 *   - six starter products
 *   - three sample gallery entries
 *   - three sample (approved) testimonials
 *
 * Run with:  npm run seed
 * Safe to re-run — it skips records that already exist.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Product = require('./models/Product');
const Gallery = require('./models/Gallery');
const Testimonial = require('./models/Testimonial');
const Stat = require('./models/Stat');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas for seeding...');

    // ---------- Admin user ----------
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mwangukufarms.co.ke').toLowerCase();
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: process.env.ADMIN_NAME || 'Mwanguku Farms Admin',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'SecureAdmin2026',
        role: 'admin',
        isVerified: true,
      });
      console.log(`Admin user created: ${admin.email}`);
    } else {
      console.log(`Admin user already exists: ${admin.email}`);
    }

    // ---------- Stats ----------
    const statsData = [
      { key: 'healthy-birds', label: 'Healthy Birds', value: 500, suffix: '+', displayOrder: 1 },
      { key: 'satisfied-customers', label: 'Satisfied Customers', value: 300, suffix: '+', displayOrder: 2 },
      { key: 'quality-products', label: 'Quality Products', value: 100, suffix: '%', displayOrder: 3 },
      { key: 'years-of-growth', label: 'Years of Growth', value: 5, suffix: '+', displayOrder: 4 },
    ];
    for (const s of statsData) {
      await Stat.findOneAndUpdate({ key: s.key }, s, { upsert: true, new: true });
    }
    console.log('Stats seeded');

    // ---------- Products ----------
    const productsData = [
      {
        name: 'Whole Chicken',
        description: 'Hygienically processed, farm-fresh whole chicken ready for your kitchen.',
        price: 700,
        category: 'Whole Chicken',
        stockQuantity: 120,
        featured: true,
      },
      {
        name: 'Fresh Eggs (Tray of 30)',
        description: 'Nutrient-rich, carefully graded eggs collected fresh daily.',
        price: 450,
        category: 'Fresh Eggs',
        stockQuantity: 200,
        featured: true,
      },
      {
        name: 'Broiler Chicken',
        description: 'Well-fed broiler chickens raised for premium size and flavour.',
        price: 650,
        category: 'Broilers',
        stockQuantity: 150,
      },
      {
        name: 'Layer Hen',
        description: 'Healthy layer hens bred for consistent, reliable egg production.',
        price: 900,
        category: 'Layers',
        stockQuantity: 80,
      },
      {
        name: 'Day Old Chicks (per chick)',
        description: 'Vaccinated, healthy day-old chicks ready to start their journey.',
        price: 120,
        category: 'Day Old Chicks',
        stockQuantity: 500,
        featured: true,
      },
      {
        name: 'Poultry Feed (70kg bag)',
        description: 'Balanced, high-quality poultry feed for optimal growth and health.',
        price: 3800,
        category: 'Feeds',
        stockQuantity: 60,
      },
    ];
    for (const p of productsData) {
      const exists = await Product.findOne({ name: p.name });
      if (!exists) await Product.create(p);
    }
    console.log('Products seeded');

    // ---------- Gallery ----------
    const galleryData = [
      { title: 'Free Range Flock', category: 'Flocks', image: '/uploads/placeholder-gallery-1.jpg' },
      { title: 'Fresh Egg Collection', category: 'Products', image: '/uploads/placeholder-gallery-2.jpg' },
      { title: 'Farm Facilities', category: 'Facilities', image: '/uploads/placeholder-gallery-3.jpg' },
    ];
    for (const g of galleryData) {
      const exists = await Gallery.findOne({ title: g.title });
      if (!exists) await Gallery.create({ ...g, uploader: admin._id });
    }
    console.log('Gallery seeded');

    // ---------- Testimonials ----------
    const testimonialsData = [
      {
        name: 'Wanjiru Kamau',
        position: 'Restaurant Owner, Nairobi',
        content:
          'Mwanguku Farms has been our go-to supplier for over two years. The chicken is always fresh and the delivery is never late.',
        rating: 5,
        isApproved: true,
        featured: true,
      },
      {
        name: 'David Otieno',
        position: 'Retail Shop Owner, Kisumu',
        content: 'The eggs are consistently high quality, and their team is professional and easy to work with.',
        rating: 5,
        isApproved: true,
      },
      {
        name: 'Faith Mwikali',
        position: 'Poultry Farmer, Machakos',
        content: 'We buy our day-old chicks from Mwanguku and the survival rate has been excellent.',
        rating: 5,
        isApproved: true,
      },
    ];
    for (const t of testimonialsData) {
      const exists = await Testimonial.findOne({ name: t.name, content: t.content });
      if (!exists) await Testimonial.create(t);
    }
    console.log('Testimonials seeded');

    console.log('\nSeeding complete!');
    console.log(`Admin login -> email: ${adminEmail} | password: ${process.env.ADMIN_PASSWORD || 'SecureAdmin2026'}`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
