import cloudinaryConfig from '../config/cloudinary_config.js';  // Import the configuration
import cloudinary from '../config/cloudinary_config.js';

// Function to create a Cloudinary folder
export async function createCloudinaryFolder(folderName) {
  try {
    await cloudinary.api.create_folder(folderName);
    console.log(`Cloudinary folder '${folderName}' created successfully`);
  } catch (error) {
    if (error.http_code === 409) {
      console.log(`Cloudinary folder '${folderName}' already exists`);
    } else {
      console.error('Error creating Cloudinary folder:', error);
      throw error;
    }
  }
}

// Function to upload an image to a Cloudinary folder
export async function uploadImageToFolder(imageBuffer, folderName) {
  try {
    const uploadResult = await cloudinary.uploader.upload(imageBuffer, {
      folder: folderName,
      // Add any other upload options you need here (e.g., transformations)
    });
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export default {
  createCloudinaryFolder,
  uploadImageToFolder
};