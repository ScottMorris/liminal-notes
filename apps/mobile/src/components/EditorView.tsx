import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import {
  createCommand,
  parseEnvelope,
  isEvent,
  EditorEvent,
  CommandType,
  MessageKind
} from '../editor/EditorProtocol';

// Import the built HTML asset
// @ts-ignore: Resolved by Metro via declarations.d.ts or assetExts configuration
import editorHtml from '../../editor-web/dist/editor.html';

interface EditorViewProps {
  onReady?: () => void;
  onDocChanged?: (payload: any) => void;
  onLinkClicked?: (payload: any) => void;
  onRequestResponse?: (payload: any) => void;
  onError?: (error: Error) => void;
  readOnly?: boolean;
}

export interface EditorViewRef {
  sendCommand: (type: CommandType['type'], payload: CommandType['payload']) => void;
}

export const EditorView = forwardRef<EditorViewRef, EditorViewProps>((props, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    sendCommand: (type, payload) => {
      const envelope = createCommand(type as any, payload); // Cast to help TS inference
      // Dispatch to document only to avoid duplicate processing in the bridge
      const script = `
        (function() {
          const event = new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(envelope))} });
          document.dispatchEvent(event);
        })();
      `;

      console.log('[EditorHost] Sending:', envelope);
      webViewRef.current?.injectJavaScript(script);
    }
  }));

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const { data } = event.nativeEvent;
      console.log('[EditorHost] Received raw:', data);

      const envelope = parseEnvelope(data);
      console.log('[EditorHost] Parsed envelope:', envelope);

      if (envelope.kind === MessageKind.Evt) {
        if (isEvent(envelope, EditorEvent.Ready)) {
           console.log('[EditorHost] Editor Ready');
           props.onReady?.();
        } else if (isEvent(envelope, EditorEvent.Changed)) {
           props.onDocChanged?.(envelope.payload);
        } else if (isEvent(envelope, EditorEvent.LinkClicked)) {
           props.onLinkClicked?.(envelope.payload);
        } else if (isEvent(envelope, EditorEvent.RequestResponse)) {
           props.onRequestResponse?.(envelope.payload);
        }
      } else if (envelope.kind === MessageKind.Err) {
        console.error('[EditorHost] Guest Error:', envelope.payload);
        props.onError?.(new Error(`Guest error: ${JSON.stringify(envelope.payload)}`));
      }
    } catch (e) {
      console.error('[EditorHost] Protocol Error:', e);
      props.onError?.(e instanceof Error ? e : new Error('Unknown protocol error'));
    }
  }, [props]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={editorHtml}
        style={styles.webview}
        onMessage={handleMessage}
        originWhitelist={['*']}
        allowFileAccess={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => <ActivityIndicator style={styles.loading} />}
        onLoadEnd={() => console.log('[EditorHost] WebView loaded')}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  }
});
