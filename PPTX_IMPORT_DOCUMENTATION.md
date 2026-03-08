# PPTX Import Pipeline Documentation

## Overview

This document describes the PPTX-to-course-ingestion pipeline that allows admins to upload PowerPoint files and automatically create lesson decks in the curriculum system.

## Architecture

### Components

1. **Firebase Function**: `importPptxDeck` - Server-side PPTX parsing and Firestore document creation
2. **Admin UI**: `PptxImportPage` - Upload interface and import orchestration
3. **Lesson Deck Builder**: Existing editor for post-import adjustments

### Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Firebase Functions v2 (Node.js 20)
- **Parsing**: JSZip + xml2js for PPTX extraction
- **Storage**: Firebase Storage for PPTX files and extracted images
- **Database**: Firestore for lesson/slide/block documents

## File Structure

```
functions/
  src/
    callables/
      importPptxDeck.ts          # Main import function

Digital Curriculum/
  src/app/
    pages/admin/
      PptxImportPage.tsx         # Upload UI
      LessonDeckBuilder.tsx      # Editor (existing)
    lib/
      curriculum.ts              # Updated with import fields
```

## Firestore Schema

### Lesson Document
```
/curricula/{curriculum_id}/modules/{module_id}/chapters/{chapter_id}/lessons/{lesson_id}
  - title: string
  - order: number
  - source_type: "pptx_import" | "manual"
  - import_status: "processing" | "ready" | "failed"
  - source_file_name: string
  - source_storage_path: string
  - is_published: boolean
  - created_by_uid: string
  - created_at: Timestamp
  - updated_at: Timestamp
```

### Slide Document
```
/curricula/{curriculum_id}/modules/{module_id}/chapters/{chapter_id}/lessons/{lesson_id}/slides/{slide_id}
  - order: number
  - source_slide_number: number
  - layout_type: LayoutType (inferred)
  - background_color: string
  - text_align: "left" | "center" | "right" | "justify"
  - theme: "dark_slide"
  - created_at: Timestamp
  - updated_at: Timestamp
```

### Block Document
```
/curricula/{curriculum_id}/modules/{module_id}/chapters/{chapter_id}/lessons/{lesson_id}/slides/{slide_id}/blocks/{block_id}
  - type: "title" | "text" | "heading" | "image" | "bullet_list" | "quote" | "callout"
  - order: number
  - content: string (for text blocks)
  - font_size: FontSize
  - font_weight: "normal" | "bold" | "semibold"
  - color: string
  - storage_path: string (for images)
  - image_url: string (for images)
  - alt_text: string (for images)
  - placement: ImagePlacement
  - width: ImageSize
  - border_radius: "none" | "sm" | "md" | "lg" | "full"
  - created_at: Timestamp
  - updated_at: Timestamp
```

## Storage Paths

### Original PPTX
```
curriculum_imports/{curriculumId}/{moduleId}/{chapterId}/source/{filename}.pptx
```

### Extracted Images
```
curriculum_imports/{curriculumId}/{moduleId}/{chapterId}/{lessonId}/slides/{slideId}/images/{filename}
```

## Function: importPptxDeck

### Input Schema
```typescript
{
  curriculum_id: string;
  module_id: string;
  chapter_id: string;
  lesson_title: string;
  source_storage_path: string;
  created_by_uid: string;
}
```

### Behavior

1. **Authentication**: Validates caller is admin
2. **Download**: Retrieves PPTX from Firebase Storage
3. **Parse**: Extracts slides, text boxes, and images using JSZip + XML parsing
4. **Infer Layout**: Determines layout type based on content
5. **Create Documents**: Writes lesson, slides, and blocks to Firestore
6. **Upload Images**: Saves extracted images to Storage
7. **Update Status**: Marks lesson as "ready" when complete

### Layout Inference Logic

- `title_only`: No image, has title, minimal text
- `text_only`: No image, no title
- `title_body`: Has title, has text, no image
- `title_left_image_right`: Has title, has image
- `bullet_list_with_image`: Has bullets, has image
- `full_image_with_caption`: Single text block, has image
- Default: `title_body`

### Text Block Classification

- **Title**: Detected via placeholder type or first large text
- **Heading**: Short text (< 100 chars), not title
- **Text**: Longer text blocks
- **Bullet List**: Detected via bullet formatting

## Admin Routes

### PPTX Import Page
```
/admin/curriculum/:curriculumId/module/:moduleId/chapter/:chapterId/import-pptx
```

### Lesson Editor (after import)
```
/admin/curriculum/:curriculumId/module/:moduleId/chapter/:chapterId/lesson/:lessonId/builder
```

## User Flow

1. **Admin navigates to import page** (from course creation wizard or admin dashboard)
2. **Selects PPTX file** - File picker validates .pptx extension
3. **Enters lesson title** - Auto-populated from filename, editable
4. **Clicks "Import PPTX"** - Triggers upload and parsing
5. **System processes**:
   - Uploads PPTX to Storage
   - Calls `importPptxDeck` function
   - Function parses and creates Firestore documents
6. **Success state** - Shows import summary (slides, blocks)
7. **Edit lesson** - Button navigates to lesson deck builder
8. **Admin edits** - Can adjust layouts, reorder blocks, add/remove content
9. **Publish** - When ready, admin publishes lesson

## Parsing Details

### PPTX Structure
PPTX files are ZIP archives containing:
- `ppt/slides/` - Slide XML files (slide1.xml, slide2.xml, etc.)
- `ppt/slides/_rels/` - Slide relationship files
- `ppt/media/` - Image and media files
- `ppt/presentation.xml` - Presentation metadata

### Text Extraction
- Parses XML to find text runs (`<a:t>` elements)
- Detects title placeholders (`<p:ph type="title">`)
- Identifies bullet lists via formatting
- Concatenates text runs intelligently

### Image Extraction
- Maps slide relationships to media files
- Extracts image buffers from ZIP
- Uploads to Firebase Storage with proper paths
- Creates image blocks linked to slides

## Limitations (v1)

1. **Layout Detection**: Automatic layout inference may not match original PPTX layout exactly
2. **Complex Shapes**: Text in shapes, tables, and complex objects may not extract perfectly
3. **Animations**: Slide transitions and animations are not preserved
4. **Fonts**: Custom fonts are not preserved (uses system defaults)
5. **Colors**: Text colors may not match exactly
6. **Positioning**: Exact pixel positioning is not preserved (uses constrained layouts)
7. **Embedded Media**: Video and audio are not extracted
8. **Notes**: Speaker notes are not imported

## Error Handling

- **File Validation**: Checks for .pptx extension
- **Empty Slides**: Warns if no slides found
- **Missing Images**: Logs warnings for missing media files
- **Parse Errors**: Catches XML parsing errors and continues
- **Storage Errors**: Handles upload failures gracefully
- **Status Tracking**: Updates lesson status to "failed" on error

## Security

- **Admin Only**: Function validates admin role via custom claims
- **Storage Rules**: Only admins can upload to import paths
- **Firestore Rules**: Only admins can create/edit draft lessons
- **Learner Access**: Only published lessons are readable by learners

## Testing

### Manual Testing Steps

1. **Prepare Test PPTX**:
   - Create a simple PowerPoint with 3-5 slides
   - Include text boxes, titles, and images
   - Save as .pptx

2. **Import Test**:
   - Navigate to import page
   - Upload test file
   - Verify upload progress
   - Check import success

3. **Verify Firestore**:
   - Check lesson document created
   - Verify slides created with correct order
   - Check blocks created for text and images
   - Confirm images uploaded to Storage

4. **Edit Test**:
   - Open lesson in editor
   - Verify all content visible
   - Test block editing
   - Test reordering
   - Publish lesson

5. **Learner Test**:
   - View lesson as learner
   - Verify content displays correctly
   - Check image loading

## Deployment

### Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions:importPptxDeck
```

### Frontend
```bash
cd "Digital Curriculum"
npm run build
# Deploy to hosting
```

## Future Enhancements

- [ ] Duplicate slide functionality
- [ ] Import report with warnings
- [ ] Per-slide "needs review" badges
- [ ] Better text extraction from complex shapes
- [ ] Support for tables
- [ ] Preserve custom fonts
- [ ] Extract speaker notes
- [ ] Batch import multiple PPTX files
