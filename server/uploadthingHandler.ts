import { createRouteHandler } from "uploadthing/express";
import { ourFileRouter } from "./uploadthing";

export const uploadthingHandler = createRouteHandler({
  router: ourFileRouter,
});