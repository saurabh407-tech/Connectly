
import cloudinary from '../services/cloudinaryServices.js';

const uploadToCloudinary = (
  buffer,
  folder = 'connectly/files',
  resourceType = 'auto',
  options = {}
) => {
  return new Promise((resolve, reject) => {
    if (!Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid file buffer'));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...options,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(new Error('Cloudinary upload returned no result'));
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

export default uploadToCloudinary;
