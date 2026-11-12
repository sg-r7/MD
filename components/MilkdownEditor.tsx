/* eslint-disable @typescript-eslint/no-require-imports */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/constants/theme';

type Props = {
  initialMarkdown?: string;
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onReady?: () => void;
  onSave?: (markdown: string) => void;
};

export type MilkdownEditorHandle = {
  requestSave: () => void;
  setMarkdown: (markdown: string) => void;
};

type EditorMessage = {
  type: 'ready' | 'change' | 'markdownResult' | 'contentReady' | 'error';
  markdown?: string;
  message?: string;
  operation?: string;
};

const htmlAsset = require('./milkdown-editor/index.html');
const cssAsset = require('./milkdown-editor/editor.css');
const scriptAsset = require('./milkdown-editor/milkdown-script.bundle');

async function readAsset(moduleId: number) {
  const asset = (await Asset.loadAsync(moduleId))[0];
  if (!asset) throw new Error('Milkdown asset was not found');
  return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
}

async function createEditorHtml() {
  const [html, css, script] = await Promise.all([readAsset(htmlAsset), readAsset(cssAsset), readAsset(scriptAsset)]);
  return html
    .replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/i, '')
    .replace('<link rel="stylesheet" href="./editor.css">', `<style>${css}</style>`)
    .replace('<script defer src="./editor.js"></script>', `<script>${script}</script>`);
}

// NoteWise's bundle talks through these two bridges. They must exist before the
// bundle initializes, otherwise ready/change/markdownResult events are lost.
const bridgeScript = `
(function() {
  function send(payload) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }
  window.notewiseEditorBridge = { postMessage: function(payload) {
    try { send(typeof payload === 'string' ? JSON.parse(payload) : payload); }
    catch (error) { send({ type: 'error', operation: 'bridge', message: String(error) }); }
  }};
  window.notewiseEditorStateBridge = { updateMarkdown: function(markdown, changedSinceSetMarkdown, documentGeneration) {
    send({ type: 'change', markdown: String(markdown || ''), changedSinceSetMarkdown: !!changedSinceSetMarkdown, documentGeneration: documentGeneration });
  }};
})(); true;
`;

export const MilkdownEditor = forwardRef<MilkdownEditorHandle, Props>(function MilkdownEditor({ initialMarkdown = '', placeholder = 'Start writing…', onChange, onReady, onSave }, ref) {
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();
  const webViewRef = useRef<{ injectJavaScript: (script: string) => void } | null>(null);
  const latestMarkdown = useRef(initialMarkdown);
  const pendingSave = useRef(false);
  const requestId = useRef(0);
  const initialScript = useMemo(() => `
    (function() {
      var markdown = ${JSON.stringify(initialMarkdown)};
      var placeholderText = ${JSON.stringify(placeholder)};
      function apply() {
        if (!window.notewiseEditor) { setTimeout(apply, 50); return; }
        window.notewiseEditor.setPlaceholder(placeholderText);
        window.notewiseEditor.setMarkdown(markdown, null, null, 0);
      }
      apply();
    })(); true;
  `, [initialMarkdown, placeholder]);

  useImperativeHandle(ref, () => ({
    requestSave() {
      pendingSave.current = true;
      requestId.current += 1;
      webViewRef.current?.injectJavaScript(`window.notewiseEditor && window.notewiseEditor.requestMarkdown(${requestId.current}); true;`);
    },
    setMarkdown(markdown: string) {
      latestMarkdown.current = markdown;
      webViewRef.current?.injectJavaScript(`window.notewiseEditor && window.notewiseEditor.setMarkdown(${JSON.stringify(markdown)}, null, null, 0); true;`);
    },
  }), []);

  useEffect(() => {
    let active = true;
    createEditorHtml().then((value) => { if (active) setHtml(value); }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load editor'); });
    return () => { active = false; };
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as EditorMessage;
      if (message.type === 'ready') onReady?.();
      if (message.type === 'change' && typeof message.markdown === 'string') {
        latestMarkdown.current = message.markdown;
        onChange?.(message.markdown);
      }
      if (message.type === 'markdownResult' && typeof message.markdown === 'string') {
        latestMarkdown.current = message.markdown;
        onChange?.(message.markdown);
        if (pendingSave.current) {
          pendingSave.current = false;
          onSave?.(message.markdown);
        }
      }
      if (message.type === 'error') setError(`${message.operation ? `${message.operation}: ` : ''}${message.message ?? 'Editor error'}`);
    } catch { setError('Invalid message received from editor'); }
  };

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!html) return <View style={styles.center}><ActivityIndicator color={colors.mint} /><Text style={styles.loading}>Loading editor…</Text></View>;
  const MilkdownWebView = WebView as unknown as React.ComponentType<Record<string, unknown>>;
  return <MilkdownWebView ref={webViewRef} source={{ html, baseUrl: 'file:///android_asset/' }} injectedJavaScriptBeforeContentLoaded={bridgeScript} injectedJavaScript={initialScript} onMessage={onMessage} javaScriptEnabled domStorageEnabled originWhitelist={['*']} allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs style={styles.webview} />;
});

const styles = StyleSheet.create({ webview: { flex: 1, backgroundColor: 'transparent' }, center: { flex: 1, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', padding: 24 }, loading: { color: colors.muted, marginTop: 10 }, error: { color: colors.danger, textAlign: 'center' } });
