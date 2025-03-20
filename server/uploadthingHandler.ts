import { createUploadthingExpressHandler } from "uploadthing/express";
import { ourFileRouter } from "./uploadthing";

export const uploadthingHandler = createUploadthingExpressHandler({
  router: ourFileRouter,
  config: {
    uploadthingSecret: process.env.UPLOADTHING_SECRET!,
    uploadthingId: process.env.UPLOADTHING_APP_ID!,
  },
});