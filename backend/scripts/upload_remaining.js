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

const remaining = [
  {
    name: 'Eau minérale 50cl',
    url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Spaghetti bolognaise',
    url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
  },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  const productSchema = new mongoose.Schema(
    { name: String, imageUrl: String, imagePublicId: String },
    { collection: 'products', timestamps: true },
  );
  const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

  for (const item of remaining) {
    console.log(`Uploading ${item.name}...`);
    const uploadRes = await cloudinary.uploader.upload(item.url, {
      folder: FOLDER,
      transformation: [
        { width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
      ],
    });
    console.log(`  Uploaded: ${uploadRes.secure_url}`);
    await Product.findOneAndUpdate(
      { name: item.name },
      { $set: { imageUrl: uploadRes.secure_url, imagePublicId: uploadRes.public_id } },
    );
    console.log(`  Updated ${item.name} in DB!`);
  }
  console.log('All remaining products updated!');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
