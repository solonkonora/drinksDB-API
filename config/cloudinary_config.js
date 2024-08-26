// import 'dotenv/config';
// import { v2 as cloudinary } from 'cloudinary';

// // Configure the Cloudinary credentials
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Function to create a folder in Cloudinary
// export async function createCloudinaryFolder(folderName) {
//     try {
//         const response = await cloudinary.api.create_folder(folderName);
//         console.log(`Folder '${folderName}' created in Cloudinary.`);
//         return response;
//     } catch (error) {
//         next(error)
//     }
// }

// // Example usage: create separate folders for different types of images
// export async function setupImageFolders() {
//     await createCloudinaryFolder('drinks-images');
// }

// export async function uploadImageToFolder(imagePath, folderName) {
//     try {
//         console.log('Image path:', imagePath);
//         console.log('Folder name:', folderName);
//         const uploadResponse = await cloudinary.uploader.upload(imagePath, {
//             folder: folderName
//         });
//         console.log(`Image uploaded to Cloudinary folder '${folderName}': ${uploadResponse.secure_url}`);
//         return uploadResponse;
//     } catch (error) {
//         console.error(`Error uploading image to Cloudinary folder '${folderName}':`, error);
//         throw error;
//     }
// }

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure the Cloudinary credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
