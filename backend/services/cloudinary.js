const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function uploadBuffer(buffer, { folder = 'tvk', publicId, resource_type = 'image' } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { folder, resource_type };
    if (publicId) opts.public_id = publicId;
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

function uploadAutoBuffer(buffer, { folder = 'tvk', originalName } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { folder, resource_type: 'auto' };
    if (originalName) {
      opts.use_filename = true;
      opts.unique_filename = true;
      opts.filename_override = originalName;
    }
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function destroy(publicId, { resource_type = 'image' } = {}) {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type });
  } catch (err) {
    console.warn('[cloudinary] destroy failed:', err.message);
    return null;
  }
}

module.exports = { cloudinary, uploadBuffer, uploadAutoBuffer, destroy };
