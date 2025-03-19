import { useUploadThing } from "@uploadthing/react";

export { useUploadThing };

export type OurFileRouter = {
  messageAttachment: {
    image: {
      maxFileSize: "4MB";
    };
    video: {
      maxFileSize: "32MB";
    };
    pdf: {
      maxFileSize: "8MB";
    };
    text: {
      maxFileSize: "1MB";
    };
  };
};