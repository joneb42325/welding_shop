const cloudinary = require('cloudinary').v2;

console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log(
  'API Key length:',
  process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.length : 'undefined'
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
