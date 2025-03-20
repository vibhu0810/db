import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../../../server/uploadthing";

// Create a ReactJS helper for UploadThing
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

// Simple async function to upload a file for a specific endpoint type
export async function uploadFile(file: File, fileType: keyof OurFileRouter) {
  try {
    // For single-use uploads, use the uploadFiles function with the correct format
    const result = await uploadFiles(fileType, {
      files: [file]
    });
    
    if (!result || result.length === 0) {
      throw new Error("Upload failed - no result returned");
    }
    
    return result[0].url;
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw error;
  }
}