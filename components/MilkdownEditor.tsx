/* eslint-disable @typescript-eslint/no-require-imports */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/constants/theme';

type Props = {
  initialMarkdown?: string;
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onReady?: () => void;
};

type EditorMessage = { type: 'ready' | 'change' | 'error'; markdown?: string; message?: string };

const htmlAsset = require('./milkdown-editor/index.html');
const cssAsset = require('./milkdown-editor/editor.css');
const scriptAsset = require('./milkdown-editor/milkdown-script.bundle');

async function readAsset(moduleId: number) {
  const asset = (await Asset.loadAsync(moduleId))[0];
  if (!asset) throw new Error('Milkdown asset was not found');
  const uri = asset.localUri ?? asset.uri;
  return FileSystem.readAsStringAsync(uri);
}

async function createEditorHtml() {
  const [html, css, script] = await Promise.all([readAsset(htmlAsset), readAsset(cssAsset), readAsset(scriptAsset)]);
  return html
    .replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/i, '')
    .replace('<link rel="stylesheet" href="./editor.css">', `<style>${css}</style>`)
    .replace('<script defer src="./editor.js"></script>', `<script>${script}</script>`);
}

const bridgeScript = `
(function() {
  function send(payload) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }
  function readMarkdown() {
    try {
      if (window.notewiseEditor && typeof window.notewiseEditor.requestMarkdown === 'function') {
        window.notewiseEditor.requestMarkdown();
      } else {
        send({ type: 'change', markdown: document.querySelector('.editor')?.innerText || '' });
      }
    } catch (error) { send({ type: 'error', message: String(error) }); }
  }
  window.addEventListener('message', function(event) {
    try {
      var command = JSON.parse(event.data || '{}');
      if (command.type === 'requestMarkdown') readMarkdown();
      if (command.type === 'setMarkdown' && window.notewiseEditor?.setMarkdown) window.notewiseEditor.setMarkdown(command.markdown || '');
    } catch (error) { send({ type: 'error', message: String(error) }); }
  });
  new MutationObserver(function() { send({ type: 'change', markdown: document.querySelector('.editor')?.innerText || '' }); }).observe(document.body, { subtree: true, childList: true, characterData: true });
  send({ type: 'ready' });
})(); true;
`;

export function MilkdownEditor({ initialMarkdown = '', placeholder = 'Start writing…', onChange, onReady }: Props) {
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();
  const injected = useMemo(() => `${bridgeScript}\nwindow.__MD_INITIAL_MARKDOWN=${JSON.stringify(initialMarkdown)}; window.__MD_PLACEHOLDER=${JSON.stringify(placeholder)};`, [initialMarkdown, placeholder]);

  useEffect(() => {
    let active = true;
    createEditorHtml().then((value) => { if (active) setHtml(value); }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load editor'); });
    return () => { active = false; };
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as EditorMessage;
      if (message.type === 'ready') onReady?.();
      if (message.type === 'change' && typeof message.markdown === 'string') onChange?.(message.markdown);
      if (message.type === 'error') setError(message.message ?? 'Editor error');
    } catch { setError('Invalid message received from editor'); }
  };

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!html) return <View style={styles.center}><ActivityIndicator color={colors.mint} /><Text style={styles.loading}>Loading editor…</Text></View>;
  const MilkdownWebView = WebView as unknown as React.ComponentType<Record<string, unknown>>;
  return <MilkdownWebView source={{ html, baseUrl: 'file:///android_asset/' }} injectedJavaScript={injected} onMessage={onMessage} javaScriptEnabled domStorageEnabled originWhitelist={['*']} allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs style={styles.webview} />;
}

const styles = StyleSheet.create({ webview: { flex: 1, backgroundColor: 'transparent' }, center: { flex: 1, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', padding: 24 }, loading: { color: colors.muted, marginTop: 10 }, error: { color: colors.danger, textAlign: 'center' } });
