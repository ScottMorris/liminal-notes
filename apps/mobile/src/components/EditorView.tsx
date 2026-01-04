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

// Cast for strict type checking until .html declaration is available
const editorHtmlSource = editorHtml as any;

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
        // Cast to any to bypass union narrowing issues with isEvent predicate
        const evt = envelope as any;
        if (isEvent(evt, EditorEvent.Ready)) {
           console.log('[EditorHost] Editor Ready');
           props.onReady?.();
        } else if (isEvent(evt, EditorEvent.Changed)) {
           props.onDocChanged?.(evt.payload);
        } else if (isEvent(evt, EditorEvent.LinkClicked)) {
           props.onLinkClicked?.(evt.payload);
        } else if (isEvent(evt, EditorEvent.RequestResponse)) {
           props.onRequestResponse?.(evt.payload);
        }
      } else if (envelope.kind === MessageKind.Err) {
        // Explicitly check for error kind since AnyMessage might not infer it correctly in all contexts
        const err = envelope as any;
        console.error('[EditorHost] Guest Error:', err.payload);
        props.onError?.(new Error(`Guest error: ${JSON.stringify(err.payload)}`));
      }
    } catch (e) {
      console.error('[EditorHost] Protocol Error:', e);
      props.onError?.(e instanceof Error ? e : new Error('Unknown protocol error'));
    }
  }, [props]);

  // Inject console forwarding script
  const injectedJavaScript = `
    (function() {
      var oldLog = console.log;
      var oldWarn = console.warn;
      var oldError = console.error;

      function logToHost(level, args) {
        // We wrap it in a special structure that parseEnvelope will fail on gracefully or we handle explicitly?
        // Actually, let's just use a distinct prefix so we can see it in raw logs.
        // Or we can just send it as a string.
        // But our handleMessage expects JSON envelopes.
        // Let's rely on handleMessage catching the JSON parse error and logging "Protocol Error" or "Received raw"
        // Wait, if it fails JSON.parse, handleMessage logs "Protocol Error".
        // Let's send a valid envelope if possible, or just raw string with prefix.
        // If we send raw string, parseEnvelope will fail.
        // Let's just log to console.
        // Note: react-native-webview doesn't automatically forward console unless we hook it.
        // To be safe, let's try to send a valid envelope or just a debug message.
        // Since we are debugging, let's just overwrite console to postMessage a specific object.

        // Actually, simplest is to just overwrite console.log to print to native log via a hack
        // but since we only have onMessage, let's just log.
      }

      function safeStringify(arg) {
        try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch (e) {
            return String(arg);
        }
      }

      console.log = function() {
        var msg = Array.from(arguments).map(safeStringify).join(' ');
        window.ReactNativeWebView.postMessage(JSON.stringify({ kind: 'log', level: 'log', message: msg }));
        oldLog.apply(console, arguments);
      };
      console.warn = function() {
        var msg = Array.from(arguments).map(safeStringify).join(' ');
        window.ReactNativeWebView.postMessage(JSON.stringify({ kind: 'log', level: 'warn', message: msg }));
        oldWarn.apply(console, arguments);
      };
      console.error = function() {
        var msg = Array.from(arguments).map(safeStringify).join(' ');
        window.ReactNativeWebView.postMessage(JSON.stringify({ kind: 'log', level: 'error', message: msg }));
        oldError.apply(console, arguments);
      };
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={editorHtmlSource}
        style={styles.webview}
        onMessage={(event) => {
            console.log('[EditorHost] onMessage fired');
            // Intercept logs first
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.kind === 'log') {
                    console.log(`[GuestConsole] [${data.level}] ${data.message}`);
                    return;
                }
            } catch (e) {
                // Not JSON or not our log format, pass to handleMessage
            }
            handleMessage(event);
        }}
        injectedJavaScript={injectedJavaScript}
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
