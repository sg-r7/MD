# MD

**MD** is a production-minded Expo/React Native PDF workspace for reading, studying, and professional document review. It combines a calm library, native PDF rendering, local document persistence, a drawing/annotation layer, sticky-note-ready data models, and native sharing.

## Stack

- Expo SDK 58 + Expo Router + TypeScript
- `react-native-pdf` for native PDF rendering (requires a development build; it is not available in Expo Go)
- `@shopify/react-native-skia` for the annotation rendering surface
- `expo-document-picker`, `expo-file-system`, `expo-sharing`
- AsyncStorage for local document metadata, preferences, and annotation state

## Setup

```bash
pnpm install
pnpm start
```

For native PDF support, build a development client:

```bash
npx expo prebuild
npx expo run:android   # or npx expo run:ios
# or use: eas build --profile development --platform android
```

Run checks with `pnpm typecheck` and `pnpm lint`.

## Architecture

- `app/` contains Expo Router screens: library, reader, note editor, and settings.
- `components/` contains reusable library cards, reader toolbar, Skia canvas, and layout primitives.
- `hooks/useLibrary.ts` owns document import, search, filters, favorites, and persistence.
- `lib/storage.ts` is the local persistence boundary. Replace it with SQLite/Cloud sync behind the same interface when sync is introduced.
- `types/` defines document, stroke, sticky note, and settings contracts.
- `constants/theme.ts` centralizes the visual system.

## What's in 1.5

- **Notebooks**: create a blank, ruled, grid or dotted notebook from the Add menu. A notebook is a PDF made in the app, so every tool works on it; add pages from the More menu.
- **Manage pages**: select pages and move them up/down, duplicate, delete or insert blank pages, with thumbnails. Annotations and bookmarks move with their pages; the PDF is rebuilt with `pdf-lib` (very large files can be slow, and document-level extras such as form fields may be dropped).
- **PDF text**: long-press selects text (system Copy menu), plus Share text and Search this text; links open after a confirmation; full-text search with next/previous; the document's table of contents.
- **Folders and recents**: coloured folders, move documents between them, a "Continue reading" strip with cover images, and tabs in the reader to jump between recent documents.
- Text selection, search and some PDF features need Android 15+ (or 12-14 with SDK extension 13); see the capability matrix of react-native-better-pdf.

## What's in 1.2

- **Outline**: pages grid, bookmarks and a list of every sticky note, each tapping through to its page. Bookmark a page or jump to a page number from the More menu.
- **Night reading** (setting + More menu) and **hide/show annotations**.
- **Coloured sticky notes**, and **Export notes (Markdown)** that bundles the study note and all sticky notes by page.
- **Language**: English / Arabic / follow device (text only; layout stays left-to-right so annotation coordinates are never mirrored).
- **Lighter ink**: pen and marker strokes are simplified on save.
- **Tests and CI**: `pnpm test` runs the geometry unit tests; `.github/workflows/ci.yml` runs tests, typecheck and lint on every push.

## What's in 1.1

- **Annotation tools**: pen, marker, eraser (segment-accurate), shapes (rectangle, ellipse, arrow, line), ruler (15° snapping), lasso (select, move, duplicate, recolor, delete), sticky notes, stickers, images, 2x/3x zoom with pan, undo/redo.
- **Reader**: real page count, resume at the last page, reading progress, page jumper, page direction setting, one page per screen so annotations stay aligned.
- **Library**: Recent (by last opened), sort (date/name/size), long-press menu (tag Study/Work, rename, delete), settings button.
- **Settings now apply**: light/dark/system theme and haptics; page direction.
- **Notes editor**: fixed a bug that corrupted the editor bundle when it was injected into the WebView, readable text in dark mode, autosave.
- **Export**: "Share annotated PDF" flattens strokes, shapes, notes and images into a copy of the PDF using `pdf-lib`.

## PDF and annotation notes

The reader uses [`react-native-better-pdf`](https://github.com/gmi-software/react-native-better-pdf) (needs `react-native-nitro-modules`, the New Architecture and a development/preview build, not Expo Go). Pages scroll continuously, pinch and double-tap zoom up to 5x run natively, and every page that is on screen or has annotations gets a `PdfPageOverlay`, so ink, notes, stickers and images stay attached to their page while you scroll and zoom.

Annotations are stored as fractions of the page (stroke width in units of 1/600 of the page width), and the original PDF is never modified. Annotations saved by earlier versions are converted automatically the first time the page sizes are known. Export maps them straight onto the PDF pages. Export limits: stickers are not drawn, and notes in non-Latin scripts (e.g. Arabic) become a marker because the built-in PDF font cannot draw them.

While a drawing tool is active, one finger draws; switch to **Read** to scroll, or use the **Zoom** button to step 1x / 2x / 3x. Night reading uses the viewer's dark pages mode.

## Design direction

MD uses a quiet studio aesthetic: deep forest surfaces, mint/lime accents, generous cards, and a strong typographic hierarchy. The interface is designed for one-handed phone use while scaling cleanly to tablets.

