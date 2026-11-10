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

- `app/` contains Expo Router screens: library, reader, and settings.
- `components/` contains reusable library cards, reader toolbar, Skia canvas, and layout primitives.
- `hooks/useLibrary.ts` owns document import, search, filters, favorites, and persistence.
- `lib/storage.ts` is the local persistence boundary. Replace it with SQLite/Cloud sync behind the same interface when sync is introduced.
- `types/` defines document, stroke, sticky note, and settings contracts.
- `constants/theme.ts` centralizes the visual system.

## PDF and annotation notes

Imported PDFs are copied into the app's document directory so the library survives app restarts. Annotation state is stored separately by document ID, which keeps the original PDF immutable and allows future export pipelines to flatten strokes/notes into a new PDF. The reader already renders persisted strokes on top of the current page and exposes pen, marker, eraser, note, reading, and share tool states; the next native iteration can attach gesture capture to `DrawingCanvas` without changing storage contracts.

For a production release, add a native PDF annotation/export bridge (for example a PSPDFKit/PDFTron integration or a custom PDFKit/PdfRenderer module) to flatten annotations into a shareable PDF. The current implementation shares the imported source document and preserves all local annotation data separately.

## Design direction

MD uses a quiet studio aesthetic: deep forest surfaces, mint/lime accents, generous cards, and a strong typographic hierarchy. The interface is designed for one-handed phone use while scaling cleanly to tablets.

