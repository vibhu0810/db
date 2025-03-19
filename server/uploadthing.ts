import { createUploadthing, type FileRouter } from "uploadthing/server";
import type { User } from "@shared/schema";

const f = createUploadthing();

// Add express request type augmentation
declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export const uploadRouter = {
  profileImage: f({ image: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      // Check if user is authenticated
      const user = req.user;
      if (!user) throw new Error("Unauthorized");

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;