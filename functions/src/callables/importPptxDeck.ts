/**
 * importPptxDeck Callable Function
 * Parses a PPTX file and creates lesson/slide/block records in Firestore
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {getAuth} from "firebase-admin/auth";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import * as JSZip from "jszip";
import {parseString} from "xml2js";
import {promisify} from "util";

const parseXml = promisify(parseString);

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

const importPptxDeckSchema = z.object({
  curriculum_id: z.string().min(1),
  module_id: z.string().min(1),
  chapter_id: z.string().min(1),
  lesson_title: z.string().min(1),
  source_storage_path: z.string().min(1),
  created_by_uid: z.string().min(1),
});

interface PptxSlide {
  slideNumber: number;
  textBoxes: Array<{
    text: string;
    isTitle: boolean;
    isBullet: boolean;
  }>;
  images: Array<{
    relationshipId: string;
    fileName: string;
  }>;
}

/**
 * Resolve the slides folder path inside the PPTX ZIP (e.g. ppt/slides or PPT/Slides).
 * @param {string[]} allFiles - All entry names in the ZIP
 * @return {string | null} The folder path to use, or null if not found
 */
function resolveSlidesFolderPath(allFiles: string[]): string | null {
  const slideXmlMatch = allFiles.find((path) => /[/\\]slides[/\\]slide\d+\.xml$/i.test(path));
  if (slideXmlMatch) {
    const parts = slideXmlMatch.replace(/\\/g, "/").split("/");
    const slidesIndex = parts.findIndex((p) => p.toLowerCase() === "slides");
    if (slidesIndex >= 0) {
      return parts.slice(0, slidesIndex + 1).join("/");
    }
  }
  return null;
}

/**
 * Parse PPTX file and extract slides, text, and images
 * @param {Buffer} pptxBuffer - The PPTX file as a buffer
 * @return {Promise<{slides: PptxSlide[], mediaFiles: Map<string, Buffer>}>} Parsed slides and media files
 */
async function parsePptxFile(pptxBuffer: Buffer): Promise<{
  slides: PptxSlide[];
  mediaFiles: Map<string, Buffer>;
}> {
  logger.info("[PARSE] Starting PPTX parsing...");
  logger.info(`[PARSE] Buffer size: ${pptxBuffer.length} bytes`);

  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(pptxBuffer);
    logger.info("[PARSE] PPTX file loaded as ZIP");
  } catch (zipError) {
    logger.error("[PARSE] Failed to load PPTX as ZIP:", zipError);
    throw new Error(`Invalid PPTX file format: ${zipError instanceof Error ? zipError.message : "Unknown error"}`);
  }

  // Log all files in ZIP for debugging
  const allFiles = Object.keys(zip.files);
  logger.info(`[PARSE] Total files in ZIP: ${allFiles.length}`);
  logger.info("[PARSE] Sample files (first 30):", allFiles.slice(0, 30).join(", "));
  const slideFilesInZip = allFiles.filter((name) => name.toLowerCase().includes("slide"));
  logger.info(`[PARSE] Files containing 'slide': ${slideFilesInZip.length}`);
  if (slideFilesInZip.length > 0) {
    logger.info("[PARSE] Slide-related paths:", slideFilesInZip.join(", "));
  }

  const slides: PptxSlide[] = [];
  const mediaFiles = new Map<string, Buffer>();

  // Resolve slides folder path (PPTX may use different casing: ppt/slides vs PPT/Slides)
  const slidesFolderPath = resolveSlidesFolderPath(allFiles);
  logger.info(`[PARSE] Resolved slides folder path: '${slidesFolderPath}'`);

  // Extract media files (try common casing)
  const mediaPaths = ["ppt/media", "PPT/media", "PPT/Media"];
  for (const mediaPath of mediaPaths) {
    const mediaFolder = zip.folder(mediaPath);
    if (mediaFolder) {
      for (const [fileName, file] of Object.entries(mediaFolder.files)) {
        const fileObj = file as JSZip.JSZipObject | null;
        if (!fileObj || fileObj.dir) continue;
        const content = await fileObj.async("nodebuffer");
        mediaFiles.set(fileName, content);
      }
      logger.info(`[PARSE] Loaded media from '${mediaPath}', ${mediaFiles.size} files`);
      break;
    }
  }

  // Parse slide relationships (try resolved path and common variants)
  const slideRels: Map<number, Map<string, string>> = new Map();
  const relsPaths = [
    slidesFolderPath ? `${slidesFolderPath}/_rels` : null,
    "ppt/slides/_rels",
    "PPT/slides/_rels",
    "PPT/Slides/_rels",
  ].filter(Boolean) as string[];
  for (const relsPath of relsPaths) {
    const slideRelsFolder = zip.folder(relsPath);
    if (slideRelsFolder) {
      for (const [fileName, file] of Object.entries(slideRelsFolder.files)) {
        const fileObj = file as JSZip.JSZipObject | null;
        if (!fileObj || fileObj.dir || !fileName.toLowerCase().endsWith(".rels")) continue;
        const slideNum = parseInt(fileName.match(/slide(\d+)\.rels/i)?.[1] || "0");
        const xmlContent = await fileObj.async("string");
        const result = await parseXml(xmlContent) as {
          Relationships?: {
            Relationship?: Array<{ $: { Id: string; Target: string } }> | { $: { Id: string; Target: string } };
          };
        };
        const relationships = new Map<string, string>();

        if (result.Relationships?.Relationship) {
          const rels = Array.isArray(result.Relationships.Relationship) ?
            result.Relationships.Relationship :
            [result.Relationships.Relationship];

          for (const rel of rels) {
            const id = rel.$.Id;
            const target = rel.$.Target;
            if (target?.startsWith("../media/")) {
              const mediaFileName = target.replace("../media/", "");
              relationships.set(id, mediaFileName);
            }
          }
        }
        slideRels.set(slideNum, relationships);
      }
      logger.info(`[PARSE] Loaded slide rels from '${relsPath}'`);
      break;
    }
  }

  // Parse slides using resolved path or fallbacks
  logger.info("[PARSE] Looking for slides folder...");
  const folderPathsToTry = slidesFolderPath ?
    [slidesFolderPath, "ppt/slides", "PPT/slides", "PPT/Slides", "ppt/Slides"] :
    ["ppt/slides", "PPT/slides", "PPT/Slides", "ppt/Slides"];
  let slidesFolder: {files: Record<string, JSZip.JSZipObject>} | null = null;
  for (const folderPath of folderPathsToTry) {
    const folder = zip.folder(folderPath);
    if (folder) {
      const slidePrefix = folderPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\/slide";
      const count = Object.keys(folder.files).filter((n) =>
        new RegExp(`^${slidePrefix}\\d+\\.xml$`, "i").test(n)
      ).length;
      logger.info(`[PARSE] Folder '${folderPath}' exists, slide*.xml count: ${count}`);
      if (count > 0) {
        slidesFolder = folder;
        logger.info(`[PARSE] Using folder: '${folderPath}'`);
        break;
      }
    }
  }

  if (!slidesFolder) {
    logger.error("[PARSE] No ppt/slides folder found in PPTX");
    const allFolders = Object.keys(zip.files).filter((name) => zip.files[name].dir);
    logger.info("[PARSE] Available folders:", allFolders.join(", "));
    throw new Error("PPTX file structure invalid: ppt/slides folder not found");
  }

  logger.info("[PARSE] Slides folder found, listing files...");
  const allSlideFiles = Object.keys(slidesFolder.files);
  logger.info(`[PARSE] Total files in slides folder: ${allSlideFiles.length}`);
  logger.info("[PARSE] All keys in slides folder:", allSlideFiles.join(", "));

  // Only match ppt/slides/slideN.xml (exclude notesSlides/notesSlideN.xml, slideLayouts, slideMasters)
  const slideFiles = allSlideFiles
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0");
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0");
      return numA - numB;
    });

  logger.info(`[PARSE] Found ${slideFiles.length} slide XML files:`, slideFiles.join(", "));
  if (slideFiles.length === 0) {
    logger.warn("[PARSE] No slide*.xml files matched; allSlideFiles above may use different naming.");
  }

  for (const slideFileName of slideFiles) {
    logger.info(`[PARSE] Processing slide file: ${slideFileName}`);
    const slideNum = parseInt(slideFileName.match(/slide(\d+)\.xml/)?.[1] || "0");
    logger.info(`[PARSE] Slide number: ${slideNum}`);

    const slideFile = slidesFolder.files[slideFileName] as JSZip.JSZipObject | null;
    if (!slideFile || slideFile.dir) {
      logger.warn(`[PARSE] Skipping ${slideFileName} - not a valid file`);
      continue;
    }

    logger.info(`[PARSE] Reading XML content for slide ${slideNum}...`);
    let xmlContent: string;
    try {
      xmlContent = await slideFile.async("string");
      logger.info(`[PARSE] XML content length: ${xmlContent.length} characters`);
    } catch (readError) {
      logger.error(`[PARSE] Error reading slide file ${slideFileName}:`, readError);
      continue;
    }

    logger.info(`[PARSE] Parsing XML for slide ${slideNum}...`);
    let slideXml: Record<string, unknown>;
    try {
      slideXml = await parseXml(xmlContent) as Record<string, unknown>;
      logger.info(`[PARSE] XML parsed successfully for slide ${slideNum}`);
      logger.info("[PARSE] Top-level keys:", Object.keys(slideXml).join(", "));
    } catch (parseError) {
      logger.error(`[PARSE] Error parsing XML for slide ${slideNum}:`, parseError);
      continue;
    }

    const textBoxes: Array<{text: string; isTitle: boolean; isBullet: boolean}> = [];
    const images: Array<{relationshipId: string; fileName: string}> = [];

    logger.info(`[PARSE] Extracting content from slide ${slideNum}...`);
    extractTextFromSlide(slideXml, textBoxes, images, slideRels, slideNum);
    logger.info(`[PARSE] Slide ${slideNum}: ${textBoxes.length} text boxes, ${images.length} images`);

    slides.push({
      slideNumber: slideNum,
      textBoxes,
      images,
    });
    logger.info(`[PARSE] Added slide ${slideNum} to slides array`);
  }

  logger.info(`[PARSE] Parsing complete: ${slides.length} slides, ${mediaFiles.size} media files`);

  return {slides, mediaFiles};
}

/**
 * Extract text and images from a slide XML structure
 * @param {Record<string, unknown>} slideXml - The parsed XML object of the slide
 * @param {Array} textBoxes - Array to populate with extracted text
 * @param {Array} images - Array to populate with extracted images
 * @param {Map} slideRels - Map of slide relationships
 * @param {number} slideNum - The current slide number
 */
function extractTextFromSlide(
  slideXml: Record<string, unknown>,
  textBoxes: Array<{text: string; isTitle: boolean; isBullet: boolean}>,
  images: Array<{relationshipId: string; fileName: string}>,
  slideRels: Map<number, Map<string, string>>,
  slideNum: number
): void {
  // Navigate to the slide content: p:sld -> p:cSld -> p:spTree -> p:sp (shapes)
  const sld = slideXml["p:sld"];
  if (!sld) {
    logger.warn(`[PARSE] Slide ${slideNum}: No p:sld element found`);
    return;
  }

  const sldObj = Array.isArray(sld) ? sld[0] : sld;
  const cSld = (sldObj as Record<string, unknown>)?.["p:cSld"];
  if (!cSld) {
    logger.warn(`[PARSE] Slide ${slideNum}: No p:cSld element found`);
    return;
  }

  const cSldObj = Array.isArray(cSld) ? cSld[0] : cSld;
  const spTree = (cSldObj as Record<string, unknown>)?.["p:spTree"];
  if (!spTree) {
    logger.warn(`[PARSE] Slide ${slideNum}: No p:spTree element found`);
    return;
  }

  // Get all shapes (p:sp) and group shapes (p:grpSp)
  const spTreeObj = Array.isArray(spTree) ? spTree[0] : spTree;
  const shapes = spTreeObj?.["p:sp"];
  const grpShapes = spTreeObj?.["p:grpSp"];

  const allShapes = Array.isArray(shapes) ? shapes : shapes ? [shapes] : [];
  const allGrpShapes = Array.isArray(grpShapes) ? grpShapes : grpShapes ? [grpShapes] : [];

  logger.info(`[PARSE] Slide ${slideNum}: Found ${allShapes.length} shapes, ${allGrpShapes.length} group shapes`);

  // Process individual shapes
  for (const shape of allShapes) {
    const txBody = shape["p:txBody"];
    const nvSpPr = shape["p:nvSpPr"];
    const ph = nvSpPr?.["p:ph"]?.[0]?.$?.type; // Placeholder type (e.g., 'title', 'body')

    if (txBody) {
      const paragraphs = txBody["a:p"] || [];
      let fullText = "";
      let isBullet = false;

      for (const p of Array.isArray(paragraphs) ? paragraphs : [paragraphs]) {
        const runs = p["a:r"] || [];
        const pText = (Array.isArray(runs) ? runs : [runs])
          .map((run: Record<string, unknown>) => {
            const text = run["a:t"];
            if (Array.isArray(text)) {
              return text.map((t: unknown) => (typeof t === "string" ? t : (t as {_?: string})?._ || "")).join("");
            }
            return typeof text === "string" ? text : (text as {_?: string})?._ || "";
          })
          .join("");

        if (pText) {
          fullText += pText + "\n";
        }

        // Check for bullet formatting
        if (p["a:pPr"]?.[0]?.["a:buChar"] || p["a:pPr"]?.[0]?.["a:buAutoNum"]) {
          isBullet = true;
        }
      }

      if (fullText.trim()) {
        textBoxes.push({
          text: fullText.trim(),
          isTitle: ph === "title" || ph === "ctrTitle",
          isBullet: isBullet,
        });
        logger.info(`[PARSE] Slide ${slideNum}: Added text box (title: ${ph === "title"}, bullet: ${isBullet})`);
      }
    }
  }

  // Process group shapes (often contains images)
  for (const grpShape of allGrpShapes) {
    const picShapes = grpShape["p:pic"] || [];
    const allPicShapes = Array.isArray(picShapes) ? picShapes : [picShapes];

    for (const pic of allPicShapes) {
      const blipFill = pic["p:blipFill"]?.[0];
      const blip = blipFill?.["a:blip"]?.[0];
      if (blip) {
        const embedId = blip.$?.["r:embed"];
        if (embedId) {
          const relationships = slideRels.get(slideNum);
          const fileName = relationships?.get(embedId);
          if (fileName) {
            images.push({relationshipId: embedId, fileName});
            logger.info(`[PARSE] Slide ${slideNum}: Added image ${fileName}`);
          }
        }
      }
    }
  }

  // Also check for images directly in shapes (not in groups)
  for (const shape of allShapes) {
    const pic = shape["p:pic"];
    if (pic) {
      const allPics = Array.isArray(pic) ? pic : [pic];
      for (const picObj of allPics) {
        const blipFill = picObj["p:blipFill"]?.[0];
        const blip = blipFill?.["a:blip"]?.[0];
        if (blip) {
          const embedId = blip.$?.["r:embed"];
          if (embedId) {
            const relationships = slideRels.get(slideNum);
            const fileName = relationships?.get(embedId);
            if (fileName) {
              images.push({relationshipId: embedId, fileName});
              logger.info(`[PARSE] Slide ${slideNum}: Added image ${fileName} from shape`);
            }
          }
        }
      }
    }
  }
}

/**
 * Infer layout type from slide content
 * @param {PptxSlide} slide - The slide to analyze
 * @return {string} The inferred layout type
 */
function inferLayoutType(slide: PptxSlide): string {
  const hasImage = slide.images.length > 0;
  const hasBullets = slide.textBoxes.some((tb) => tb.isBullet);
  const hasTitle = slide.textBoxes.some((tb) => tb.isTitle);
  const textCount = slide.textBoxes.length;

  if (!hasImage && !hasTitle && textCount === 0) {
    return "text_only";
  }
  if (!hasImage && hasTitle && textCount <= 1) {
    return "title_only";
  }
  if (!hasImage && hasTitle) {
    return "title_body";
  }
  if (hasImage && hasBullets) {
    return "bullet_list_with_image";
  }
  if (hasImage && textCount === 1) {
    return "full_image_with_caption";
  }
  if (hasImage && hasTitle) {
    return "title_left_image_right";
  }
  return "title_body";
}

export const importPptxDeck = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 540, // 9 minutes for large files
    memory: "1GiB",
  },
  async (request) => {
    const callerUid = request.auth?.uid;

    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check if user is admin - check Firestore first (more reliable), then custom claims as fallback
    const user = await auth.getUser(callerUid);
    logger.info("[IMPORT] User email:", user.email);
    logger.info("[IMPORT] Checking admin status...");

    let isAdmin = false;
    let callerRoles: string[] = [];

    // First, check Firestore user document (most reliable)
    try {
      const userDocRef = db.collection("users").doc(callerUid);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const firestoreRoles = userData?.roles;
        if (Array.isArray(firestoreRoles)) {
          callerRoles = firestoreRoles;
        } else {
          callerRoles = [];
        }
        logger.info("[IMPORT] Roles from Firestore:", JSON.stringify(callerRoles));

        isAdmin = callerRoles.includes("superAdmin") ||
          callerRoles.includes("Admin") ||
          callerRoles.includes("admin");
      } else {
        logger.warn("[IMPORT] User document not found in Firestore");
      }
    } catch (firestoreError) {
      logger.warn("[IMPORT] Error reading Firestore user document:", firestoreError);
    }

    // Fallback: check custom claims if Firestore check didn't find admin
    if (!isAdmin) {
      logger.info("[IMPORT] Checking custom claims as fallback...");
      const customClaims = user.customClaims || {};
      logger.info("[IMPORT] User custom claims:", JSON.stringify(customClaims));

      if (Array.isArray(customClaims.roles)) {
        callerRoles = customClaims.roles;
      } else if (customClaims.roles && typeof customClaims.roles === "object") {
        // If roles is an object, extract keys where value is true
        callerRoles = Object.keys(customClaims.roles).filter(
          (key) => (customClaims.roles as Record<string, boolean>)[key] === true
        );
      }

      isAdmin = callerRoles.includes("superAdmin") ||
        callerRoles.includes("Admin") ||
        callerRoles.includes("admin");
    }

    logger.info(`[IMPORT] Is admin: ${isAdmin}, roles:`, JSON.stringify(callerRoles));

    if (!isAdmin) {
      logger.error(`[IMPORT] User ${callerUid} (${user.email}) is not an admin.`);
      logger.error("[IMPORT] Roles checked:", JSON.stringify(callerRoles));
      throw new HttpsError("permission-denied", "Only admins can import PPTX decks");
    }

    // Log incoming request data
    logger.info("[IMPORT] Received request data:", JSON.stringify(request.data));
    logger.info("[IMPORT] Caller UID:", callerUid);

    // Validate input
    const validationResult = importPptxDeckSchema.safeParse(request.data);
    if (!validationResult.success) {
      logger.error("[IMPORT] Validation failed:", JSON.stringify(validationResult.error));
      throw new HttpsError(
        "invalid-argument",
        `Invalid input: ${validationResult.error.message}`
      );
    }

    const {
      curriculum_id: curriculumId,
      module_id: moduleId,
      chapter_id: chapterId,
      lesson_title: lessonTitle,
      source_storage_path: sourceStoragePath,
      created_by_uid: createdByUid,
    } = validationResult.data;

    logger.info("[IMPORT] Validated parameters:", {
      curriculumId,
      moduleId,
      chapterId,
      lessonTitle,
      sourceStoragePath,
      createdByUid,
    });

    let lessonId: string | undefined;

    try {
      logger.info(`[IMPORT] Starting PPTX import for: ${lessonTitle}`);
      logger.info(`[IMPORT] curriculumId: ${curriculumId}, moduleId: ${moduleId}, chapterId: ${chapterId}`);
      logger.info(`[IMPORT] sourceStoragePath: ${sourceStoragePath}`);

      // Download PPTX file from Storage
      const bucket = storage.bucket();
      logger.info(`[IMPORT] Bucket name: ${bucket.name}`);
      const pptxFile = bucket.file(sourceStoragePath);
      logger.info(`[IMPORT] Checking if file exists: ${sourceStoragePath}`);

      let exists: boolean;
      try {
        [exists] = await pptxFile.exists();
        logger.info(`[IMPORT] File exists check result: ${exists}`);

        if (!exists) {
          logger.error(`[IMPORT] PPTX file not found in Storage: ${sourceStoragePath}`);
          throw new HttpsError("not-found", `PPTX file not found in Storage: ${sourceStoragePath}`);
        }
      } catch (fileCheckError) {
        logger.error("[IMPORT] Error checking file existence:", fileCheckError);
        if (fileCheckError instanceof HttpsError) {
          throw fileCheckError;
        }
        const errorMsg = fileCheckError instanceof Error ?
          fileCheckError.message :
          "Unknown error";
        throw new HttpsError("internal", `Failed to check file existence: ${errorMsg}`);
      }

      logger.info("[IMPORT] File exists, downloading...");
      let pptxBuffer: Buffer;
      try {
        [pptxBuffer] = await pptxFile.download();
        logger.info(`[IMPORT] Downloaded ${pptxBuffer.length} bytes`);
      } catch (downloadError) {
        logger.error("[IMPORT] Error downloading file:", downloadError);
        const errorMsg = downloadError instanceof Error ?
          downloadError.message :
          "Unknown error";
        throw new HttpsError("internal", `Failed to download file: ${errorMsg}`);
      }

      // Parse PPTX
      logger.info("[IMPORT] Parsing PPTX file...");
      logger.info(`[IMPORT] PPTX buffer size: ${pptxBuffer.length} bytes`);

      let slides: PptxSlide[];
      let mediaFiles: Map<string, Buffer>;

      try {
        const parseResult = await parsePptxFile(pptxBuffer);
        slides = parseResult.slides;
        mediaFiles = parseResult.mediaFiles;
        logger.info(`[IMPORT] Parsed ${slides.length} slides and ${mediaFiles.size} media files`);
      } catch (parseError) {
        logger.error("[IMPORT] Error parsing PPTX file:", parseError);
        if (parseError instanceof Error) {
          logger.error(`[IMPORT] Parse error message: ${parseError.message}`);
          logger.error(`[IMPORT] Parse error stack: ${parseError.stack}`);
        }
        const errorMsg = parseError instanceof Error ? parseError.message : "Unknown error";
        throw new HttpsError("internal", `Failed to parse PPTX file: ${errorMsg}`);
      }

      if (slides.length === 0) {
        logger.error("[IMPORT] No slides found in PPTX file");
        logger.error("[IMPORT] PPTX buffer size:", pptxBuffer.length);
        logger.error("[IMPORT] Media files found:", mediaFiles.size);
        const errorMsg = "No slides found in PPTX file. Please ensure the file is a valid PowerPoint presentation.";
        throw new HttpsError("invalid-argument", errorMsg);
      }

      // Create lesson document
      const lessonRef = db
        .collection("curricula")
        .doc(curriculumId)
        .collection("modules")
        .doc(moduleId)
        .collection("chapters")
        .doc(chapterId)
        .collection("lessons")
        .doc();

      lessonId = lessonRef.id;
      logger.info(`[IMPORT] Created lesson document with ID: ${lessonId}`);

      await lessonRef.set({
        title: lessonTitle,
        order: 0, // Will be updated if needed
        theme: "dark_slide",
        is_published: false,
        source_type: "pptx_import",
        import_status: "processing",
        source_file_name: sourceStoragePath.split("/").pop(),
        source_storage_path: sourceStoragePath,
        created_by_uid: createdByUid,
        curriculum_id: curriculumId,
        module_id: moduleId,
        chapter_id: chapterId,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
      logger.info(`[IMPORT] Created lesson document with ID: ${lessonId}`);

      // Process each slide
      logger.info(`[IMPORT] Processing ${slides.length} slides...`);
      const batch = db.batch();
      let blockOrder = 0;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        logger.info(`[IMPORT] Processing slide ${i + 1}/${slides.length} (slide number ${slide.slideNumber})`);
        const slideRef = lessonRef.collection("slides").doc();

        // Infer layout
        const layoutType = inferLayoutType(slide);
        logger.info(`[IMPORT] Inferred layout type: ${layoutType} for slide ${i + 1}`);

        // Create slide document
        batch.set(slideRef, {
          order: i,
          source_slide_number: slide.slideNumber,
          layout_type: layoutType,
          background_color: "#000000",
          text_align: "left",
          theme: "dark_slide",
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });

        const slideId = slideRef.id;

        // Create text blocks
        logger.info(`[IMPORT] Creating ${slide.textBoxes.length} text blocks for slide ${i + 1}`);
        for (const textBox of slide.textBoxes) {
          const blockRef = slideRef.collection("blocks").doc();
          const blockType = textBox.isTitle ?
            "title" :
            textBox.isBullet ?
              "bullet_list" :
              textBox.text.length > 100 ?
                "text" :
                "heading";
          logger.info(`[IMPORT] Creating ${blockType} block (${textBox.text.substring(0, 50)}...)`);

          batch.set(blockRef, {
            type: blockType,
            order: blockOrder++,
            content: textBox.text,
            font_size: textBox.isTitle ? "3xl" : textBox.isBullet ? "md" : "lg",
            font_weight: textBox.isTitle ? "bold" : "normal",
            color: "#fafcfc",
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        // Upload images and create image blocks
        logger.info(`[IMPORT] Processing ${slide.images.length} images for slide ${i + 1}`);
        for (const image of slide.images) {
          const imageBuffer = mediaFiles.get(image.fileName);
          if (!imageBuffer) {
            logger.warn(`[IMPORT] Image not found: ${image.fileName}`);
            continue;
          }
          logger.info(`[IMPORT] Uploading image: ${image.fileName}`);

          // Upload image to Storage
          const imageStoragePath =
            `curriculum_imports/${curriculumId}/${moduleId}/${chapterId}/` +
            `${lessonId}/slides/${slideId}/images/${image.fileName}`;
          const imageFile = bucket.file(imageStoragePath);
          const contentType = image.fileName.endsWith(".png") ?
            "image/png" :
            image.fileName.endsWith(".jpg") || image.fileName.endsWith(".jpeg") ?
              "image/jpeg" :
              "image/png";
          await imageFile.save(imageBuffer, {
            metadata: {
              contentType,
            },
          });

          // Get download URL
          await imageFile.makePublic();
          const imageUrl = `https://storage.googleapis.com/${bucket.name}/${imageStoragePath}`;

          // Create image block
          const imageBlockRef = slideRef.collection("blocks").doc();
          batch.set(imageBlockRef, {
            type: "image",
            order: blockOrder++,
            storage_path: imageStoragePath,
            image_url: imageUrl,
            alt_text: image.fileName,
            placement: "center",
            width: "large",
            border_radius: "md",
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          });
        }
      }

      // Commit all writes
      logger.info(`[IMPORT] Committing batch write with ${slides.length} slides...`);
      await batch.commit();
      logger.info("[IMPORT] Batch committed successfully");

      // Update lesson status to ready
      logger.info("[IMPORT] Updating lesson status to ready...");
      await lessonRef.update({
        import_status: "ready",
        updated_at: FieldValue.serverTimestamp(),
      });
      logger.info("[IMPORT] Lesson status updated to ready");

      logger.info(
        `[IMPORT] Successfully imported PPTX: ${slides.length} slides, ${blockOrder} blocks, lesson ID: ${lessonId}`
      );

      return {
        success: true,
        lesson_id: lessonId,
        slides_imported: slides.length,
        blocks_created: blockOrder,
      };
    } catch (error) {
      logger.error("[IMPORT] Error importing PPTX deck:", error);
      if (error instanceof Error) {
        logger.error(`[IMPORT] Error message: ${error.message}`);
        logger.error(`[IMPORT] Error stack: ${error.stack}`);
        logger.error(`[IMPORT] Error name: ${error.name}`);
      } else {
        logger.error("[IMPORT] Unknown error type:", JSON.stringify(error));
      }

      // Re-throw HttpsError as-is, wrap others
      if (error instanceof HttpsError) {
        throw error;
      }

      // Try to update lesson status to failed if lesson was created
      // Note: lessonId might not be available if error occurred before lesson creation
      if (lessonId) {
        try {
          const lessonRef = db
            .collection("curricula")
            .doc(curriculumId)
            .collection("modules")
            .doc(moduleId)
            .collection("chapters")
            .doc(chapterId)
            .collection("lessons")
            .doc(lessonId);
          await lessonRef.update({
            import_status: "failed",
            updated_at: FieldValue.serverTimestamp(),
          });
          logger.info(`[IMPORT] Updated lesson ${lessonId} status to failed`);
        } catch (updateError) {
          logger.error("[IMPORT] Failed to update lesson status:", updateError);
        }
      }

      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      throw new HttpsError("internal", `Failed to import PPTX: ${errorMsg}`);
    }
  }
);
