import { createUploadthing, type FileRouter } from "uploadthing/server";
import type { User } from "@shared/schema";

const f = createUploadthing({
  errorFormatter: (err) => {
    console.error("Upload error:", err);
    return { message: err.message };
  },
});

// Add express request type augmentation
declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

if (!process.env.UPLOADTHING_SECRET) {
  console.warn("UPLOADTHING_SECRET is not set - file upload functionality will be disabled");
  if (process.env.NODE_ENV !== 'production') {
    throw new Error("UPLOADTHING_SECRET environment variable is required for development");
  }
}

console.log("Initializing UploadThing with configuration...");

export const uploadRouter = {
  profileImage: f({ image: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      // Check if user is authenticated
      const user = req.user;
      if (!user) throw new Error("Unauthorized");

      console.log("Processing upload request for user:", user.id);
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completed:", file);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;