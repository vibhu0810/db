import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

// Define file size limits and allowed types
const maxFileSize = "4MB";

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you need
  profileImage: f({ image: { maxFileSize } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // For Express apps, user is added by passport to the req object
      const user = (req as any).user;
      if (!user) {
        throw new Error("Unauthorized");
      }

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);

      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // You can add more upload routes for different file types and purposes
  companyLogo: f({ image: { maxFileSize } })
    .middleware(async ({ req }) => {
      const user = (req as any).user;
      if (!user) {
        throw new Error("Unauthorized");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Company logo upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // This route allows PDF uploads for documents
  document: f({ pdf: { maxFileSize: "16MB" } })
    .middleware(async ({ req }) => {
      const user = (req as any).user;
      if (!user) {
        throw new Error("Unauthorized");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Document upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
    
  // Chat image attachment uploads
  chatImage: f({ image: { maxFileSize: "8MB" } })
    .middleware(async ({ req }) => {
      const user = (req as any).user;
      if (!user) {
        throw new Error("Unauthorized");
      }
      return { userId: user.id, purpose: "chat" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Chat image upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
    
  // Chat voice message uploads
  chatAudio: f({ audio: { maxFileSize: "16MB" } })
    .middleware(async ({ req }) => {
      const user = (req as any).user;
      if (!user) {
        throw new Error("Unauthorized");
      }
      return { userId: user.id, purpose: "chat" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Chat audio upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
    
  // Invoice document uploads (PDF, Word, etc.)
  invoice: f({ pdf: { maxFileSize: "16MB" }, "application/msword": { maxFileSize: "16MB" }, "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB" } })
    .middleware(async ({ req }) => {
      const user = (req as any).user;
      if (!user?.is_admin) {
        throw new Error("Unauthorized: Only admins can upload invoices");
      }
      return { userId: user.id, purpose: "invoice" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Invoice document upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;