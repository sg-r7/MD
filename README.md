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

Annotations are stored per document (normalised 0..1 against the reader viewport) and the original PDF is never modified. The reader shows one page per screen, fitted and centred (`fitPolicy=2`, paging on), and export assumes exactly that layout. Export limits: stickers are not drawn, and notes in non-Latin scripts (e.g. Arabic) are exported as a marker because the built-in PDF font cannot draw them. If strokes look offset on a specific device, check the page-fit assumption in `lib/exportPdf.ts`.

## Design direction

MD uses a quiet studio aesthetic: deep forest surfaces, mint/lime accents, generous cards, and a strong typographic hierarchy. The interface is designed for one-handed phone use while scaling cleanly to tablets.

