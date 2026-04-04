/**
 * Proxy function to serve course files with CORS headers
 * This bypasses CORS issues when accessing Firebase Storage files
 */

import {onRequest} from "firebase-functions/v2/https";
import {getStorage} from "firebase-admin/storage";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const getCourseFile = onRequest(
  {
    cors: true, // Enable CORS for all origins
    region: "us-central1",
  },
  async (req, res) => {
    try {
      // Get file path from query parameter
      const filePath = req.query.path as string;

      if (!filePath) {
        res.status(400).json({error: "File path is required"});
        return;
      }

      // Get the file from Firebase Storage
      const bucket = getStorage().bucket();
      const file = bucket.file(filePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({error: "File not found"});
        return;
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || "application/pdf";

      // Set CORS headers
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");

      // Handle OPTIONS request (preflight)
      if (req.method === "OPTIONS") {
        res.status(204).send();
        return;
      }

      // Stream the file to the response
      const stream = file.createReadStream();
      stream.pipe(res);

      stream.on("error", (error) => {
        console.error("Error streaming file:", error);
        if (!res.headersSent) {
          res.status(500).json({error: "Error streaming file"});
        }
      });
    } catch (error) {
      console.error("Error in getCourseFile:", error);
      if (!res.headersSent) {
        res.status(500).json({error: "Internal server error"});
      }
    }
  }
);
