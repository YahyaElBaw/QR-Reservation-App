const { v2: cloudinary } = require('cloudinary');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dz5vhdei';
const API_KEY = process.env.CLOUDINARY_API_KEY || '496987866616558';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'GIh1gvLbJNsKyi5DesphJmOaI8k';
const FOLDER = process.env.CLOUDINARY_FOLDER || 'QrCodeApp';
const MONGO_URI = process.env.MONGO_URI;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

const productImages = [
  {
    name: 'Café expresso',
    url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Café crème',
    url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Thé à la menthe',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Jus d’orange',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Limonade maison',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Eau minérale 50cl',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pizza margherita',
    url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Spaghetti bolognaise',
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Salade tunisienne',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Tiramisu',
    url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Crêpe chocolat',
    url: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Makroudh',
    url: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=800&q=80',
  },
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected.');

  const productSchema = new mongoose.Schema(
    {
      name: String,
      imageUrl: String,
      imagePublicId: String,
    },
    { collection: 'products', timestamps: true },
  );

  const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

  for (const item of productImages) {
    try {
      console.log(`Uploading image for "${item.name}" to Cloudinary (folder: ${FOLDER})...`);
      const uploadRes = await cloudinary.uploader.upload(item.url, {
        folder: FOLDER,
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
        ],
      });

      console.log(`  Uploaded! URL: ${uploadRes.secure_url} (ID: ${uploadRes.public_id})`);

      // Update product in DB
      const updated = await Product.findOneAndUpdate(
        { name: item.name },
        {
          $set: {
            imageUrl: uploadRes.secure_url,
            imagePublicId: uploadRes.public_id,
          },
        },
        { new: true },
      );

      if (updated) {
        console.log(`  Updated MongoDB document for "${item.name}" (ID: ${updated._id})`);
      } else {
        console.warn(`  Product "${item.name}" not found in DB!`);
      }
    } catch (err) {
      console.error(`  Error uploading/updating "${item.name}":`, err.message || err);
    }
  }

  console.log('Done uploading all images!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
