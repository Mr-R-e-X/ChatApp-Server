import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const getBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

export const uploadFileInCloudinary = async (file) => {
  try {
    // Configure Cloudinary with environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Check if file path is provided
    if (!file) return null;

    // Upload the file to Cloudinary
    const uploadedDataResponse = await cloudinary.uploader
      .upload(getBase64(file), { resource_type: "auto" })
      .catch((error) => {
        console.log(error);
        throw error;
      });

    return {
      publicId: uploadedDataResponse.public_id,
      url: uploadedDataResponse.secure_url,
    };
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    return null;
  }
};

export const deleteFileFromCloudinary = async (publicId) => {};
