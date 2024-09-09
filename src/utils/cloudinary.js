import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

/**
 * Uploads a file to Cloudinary and removes it from local storage.
 *
 * @async
 * @function uploadFileInCloudinary
 * @param {string} localFilePath - The path to the local file that needs to be uploaded.
 * @returns {Promise<Object|null>} The response from Cloudinary if the upload is successful, or `null` if the file path is invalid or an error occurs.
 * @throws {Error} Throws an error if the upload fails or if there are issues with file deletion.
 */
export const uploadFileInCloudinary = async (localFilePath) => {
  try {
    // Configure Cloudinary with environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Check if file path is provided
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const uploadedDataResponse = await cloudinary.uploader
      .upload(localFilePath, { resource_type: "auto" })
      .catch((error) => {
        console.log(error);
        throw error;
      });

    // Remove the local file after upload
    fs.unlinkSync(localFilePath);
    // console.log(uploadedDataResponse);
    return {
      publicId: uploadedDataResponse.public_id,
      url: uploadedDataResponse.secure_url,
    };
  } catch (error) {
    // Handle errors (log and ensure the local file is deleted)
    console.error("Error uploading file to Cloudinary:", error);
    fs.unlinkSync(localFilePath); // Ensure local file is removed even if an error occurs
    return null;
  }
};

export const deleteFileFromCloudinary = async (publicId) => {};
