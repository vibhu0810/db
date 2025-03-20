import { createRouteHandler } from "uploadthing/express";
import { ourFileRouter } from "./uploadthing";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// For uploadthing v7, you don't need to pass the secret/app ID in the handler
// These are automatically picked up from environment variables
export const uploadthingHandler = createRouteHandler({
  router: ourFileRouter,
});