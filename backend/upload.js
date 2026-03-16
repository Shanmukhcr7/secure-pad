const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'secure-pad',
        // Keep original filename (sanitised)
        public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        // Let Cloudinary auto-detect resource type (image / raw / video)
        resource_type: 'auto',
        // Apply automatic optimizations for images
        quality: 'auto',
        fetch_format: 'auto',
        // Don't transform — store as-is
        use_filename: true,
        unique_filename: false,
    }),
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

module.exports = { upload, cloudinary };
