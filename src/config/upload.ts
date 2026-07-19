import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Para aceitar arquivos de áudio e pdf, definimos o resource_type como 'auto'
    return {
      folder: 'maestro_cifras_uploads',
      resource_type: 'auto',
      public_id: `${Date.now()}-${file.originalname.replace(/\\s/g, '_').split('.')[0]}`,
    };
  },
});

export const uploadConfig = {
  storage: storage,
};
