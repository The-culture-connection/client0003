# Curriculum System Documentation

## Overview

The new curriculum system replaces PDF-based lesson content with a structured slide-based deck builder. Admins can create lessons using text and images with constrained layout options, and learners view lessons slide-by-slide.

## Architecture

### Component Map

#### Shared Rendering Components
- **`BlockRenderer`** (`src/app/components/curriculum/BlockRenderer.tsx`)
  - Renders individual content blocks (text, heading, image, bullet_list, quote, callout)
  - Used by both preview and learner-facing views
  
- **`SlideRenderer`** (`src/app/components/curriculum/SlideRenderer.tsx`)
  - Renders complete slides with layout logic
  - Handles all 10 layout types
  - Uses BlockRenderer for individual blocks
  - Used by both preview and learner-facing views

#### Admin Components
- **`LessonDeckBuilder`** (`src/app/pages/admin/LessonDeckBuilder.tsx`)
  - Main admin interface for creating/editing lessons
  - Split layout: editor (left) + preview (right)
  - Includes slide list, slide editor, block editor
  - Live preview updates as admin edits

- **`SlideEditorPanel`** (within LessonDeckBuilder)
  - Edits slide-level settings (layout, title, font sizes, text align)
  
- **`BlockEditorPanel`** (within LessonDeckBuilder)
  - Edits individual content blocks
  - Handles image uploads
  - Type-specific editing forms

- **`LessonPreviewModal`** (within LessonDeckBuilder)
  - Full lesson preview with navigation
  - Shows all slides in sequence

#### Learner Components
- **`LessonPlayer`** (`src/app/pages/learn/LessonPlayer.tsx`)
  - Learner-facing lesson viewer
  - Slide-by-slide navigation
  - Progress indicator
  - Uses shared SlideRenderer and BlockRenderer

## Firestore Collection Paths

### Curriculum Structure
```
/curricula/{curriculumId}
  - title
  - description
  - created_by_uid
  - created_at
  - updated_at

/curricula/{curriculumId}/modules/{moduleId}
  - title
  - order
  - created_at
  - updated_at

/curricula/{curriculumId}/modules/{moduleId}/chapters/{chapterId}
  - title
  - order
  - created_at
  - updated_at

/curricula/{curriculumId}/modules/{moduleId}/chapters/{chapterId}/lessons/{lessonId}
  - title
  - order
  - theme: "dark_slide"
  - is_published: boolean
  - created_by_uid
  - curriculum_id (parent reference)
  - module_id (parent reference)
  - chapter_id (parent reference)
  - created_at
  - updated_at

/curricula/{curriculumId}/modules/{moduleId}/chapters/{chapterId}/lessons/{lessonId}/slides/{slideId}
  - order
  - layout_type
  - title
  - title_font_size
  - body_font_size
  - background_color
  - text_align
  - theme
  - created_at
  - updated_at

/curricula/{curriculumId}/modules/{moduleId}/chapters/{chapterId}/lessons/{lessonId}/slides/{slideId}/blocks/{blockId}
  - type: "text" | "image" | "heading" | "bullet_list" | "quote" | "callout"
  - order
  - content
  - font_size
  - font_weight
  - color
  - storage_path (for images)
  - image_url (for images)
  - alt_text (for images)
  - placement (for images)
  - width (for images)
  - border_radius (for images)
  - created_at
  - updated_at
```

## Firebase Storage Paths

### Lesson Assets
```
lesson_assets/{curriculumId}/{moduleId}/{chapterId}/{lessonId}/{slideId}/{filename}
```

- Images are uploaded to Firebase Storage
- Storage path and download URL are stored in Firestore block documents
- Max file size: 5MB
- Allowed types: PNG, JPG, JPEG, WEBP

## Layout Types

1. **title_only** - Centered title slide
2. **text_only** - Text content only
3. **title_body** - Title + body text
4. **title_left_image_right** - Title and text on left, image on right
5. **image_left_text_right** - Image on left, title and text on right
6. **full_image_with_caption** - Full-width image with caption below
7. **two_column_text** - Two-column text layout
8. **bullet_list_with_image** - Bullet list with image
9. **centered_callout** - Centered callout box
10. **quote_slide** - Quote/blockquote layout

## Font Size Tokens

- `sm` - Small
- `md` - Medium (default)
- `lg` - Large
- `xl` - Extra Large
- `2xl` - 2X Large
- `3xl` - 3X Large

## Image Size Tokens

- `small` - 128x128px
- `medium` - 192x192px (default)
- `large` - 256x256px
- `full` - Full width

## Image Placement Tokens

- `left` - Left aligned
- `center` - Center aligned (default)
- `right` - Right aligned
- `full_width` - Full width

## Block Types

1. **text** - Paragraph text
2. **heading** - Heading (h1, h2, h3 based on font size)
3. **image** - Image with upload, alt text, placement, size options
4. **bullet_list** - Bulleted list (items separated by newlines)
5. **quote** - Blockquote with left border
6. **callout** - Highlighted callout box

## Preview Architecture

### Live Preview (Admin)
- Updates in real-time as admin edits
- Uses local state (not saved to Firestore until "Save Draft")
- Shows selected slide in right panel
- Device view toggle (desktop/tablet/mobile)

### Full Lesson Preview (Admin)
- Modal showing all slides in sequence
- Next/Previous navigation
- Progress indicator
- Uses same SlideRenderer as learner view

### Learner View
- Full-screen lesson player
- Slide-by-slide navigation
- Progress bar
- Uses same SlideRenderer and BlockRenderer as preview

## Save/Publish Flow

1. **Draft State**
   - Admin edits lesson locally (in-memory state)
   - Changes are not saved until "Save Draft" is clicked
   - Unsaved changes warning before navigation

2. **Save Draft**
   - Saves all changes to Firestore
   - Updates `updated_at` timestamp
   - Lesson remains unpublished

3. **Publish**
   - Sets `is_published: true`
   - Lesson becomes visible to learners
   - Only published lessons are accessible via learner route

## Security Rules

### Firestore Rules
- **Lessons**: Learners can read only published lessons, admins can read/write all
- **Slides**: Same as lessons (inherits from parent lesson)
- **Blocks**: Same as lessons (inherits from parent lesson)
- **Admin access**: Requires `superAdmin` or `Admin` role

### Storage Rules
- **Read**: All authenticated users (for published lesson images)
- **Write**: Only `superAdmin` role
- **Path**: `lesson_assets/{curriculumId}/{moduleId}/{chapterId}/{lessonId}/{slideId}/{filename}`

## Routes

### Admin Routes
- `/admin/curriculum/:curriculumId/module/:moduleId/chapter/:chapterId/lesson/:lessonId/builder`
  - Lesson deck builder (admin only)

### Learner Routes
- `/learn/lesson/:lessonId?curriculumId=...&moduleId=...&chapterId=...`
  - Lesson player (authenticated users, published lessons only)

## Testing with Sample Content

### Create a Test Lesson

1. **Create Curriculum Structure**
   ```typescript
   // Via admin panel or directly in Firestore
   - Create curriculum
   - Create module
   - Create chapter
   - Create lesson
   ```

2. **Add Slides**
   - Navigate to lesson builder
   - Click "Add Slide" and select layout type
   - Edit slide settings (title, font sizes, etc.)

3. **Add Content Blocks**
   - Select a slide
   - Click "Add Block"
   - Choose block type
   - Fill in content
   - For images: upload image file

4. **Preview**
   - Use live preview (right panel) to see changes
   - Click "Preview Lesson" for full lesson preview

5. **Publish**
   - Click "Publish" button
   - Lesson becomes available to learners

### Sample Lesson Structure

```
Lesson: "Introduction to Business"
  Slide 1 (title_only):
    - Heading: "Welcome to Business 101"
  
  Slide 2 (title_body):
    - Title: "What is Business?"
    - Text: "Business is the activity of making one's living..."
  
  Slide 3 (image_left_text_right):
    - Image: business-diagram.png
    - Heading: "Business Model"
    - Text: "A business model describes..."
  
  Slide 4 (bullet_list_with_image):
    - Bullet List:
      - "Identify your market"
      - "Define your value proposition"
      - "Build your team"
    - Image: team-photo.jpg
```

## Migration Notes

### Old System (PDF-based)
- Files stored at: `courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/slides.{extension}`
- Single file per lesson
- No structured content editing

### New System (Slide-based)
- Structured Firestore collections
- Multiple slides per lesson
- Rich content blocks (text, images, lists, quotes, callouts)
- Live preview and editing

### Backward Compatibility
- Old course files still accessible via Storage rules
- New system uses separate `curricula` collection
- No automatic migration - admins must recreate lessons in new system

## Future Enhancements

- Duplicate slide/block functionality
- Preset slide templates
- Keyboard shortcuts for navigation
- Theme toggle in preview
- Slide reordering via drag-and-drop
- Bulk operations (duplicate lesson, etc.)
