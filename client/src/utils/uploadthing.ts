/**
 * This is a simple uploader utility for profile pictures and company logos
 * Uses fetch to communicate with our UploadThing endpoints
 */

// Function to upload a file to the specified endpoint
export async function uploadFile(file: File, endpoint: string) {
  try {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Send the file to the UploadThing endpoint
    const response = await fetch(`/api/uploadthing/${endpoint}`, {
      method: 'POST',
      body: formData,
      credentials: 'include' // Important for auth
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Custom hook to handle uploading profile images
export function useUploadThing() {
  const uploadProfileImage = async (file: File) => {
    return uploadFile(file, 'profileImage');
  };
  
  const uploadCompanyLogo = async (file: File) => {
    return uploadFile(file, 'companyLogo');
  };
  
  const uploadDocument = async (file: File) => {
    return uploadFile(file, 'document');
  };

  return {
    uploadProfileImage,
    uploadCompanyLogo,
    uploadDocument
  };
}