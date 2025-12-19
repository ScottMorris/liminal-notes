export interface AiProgress {
  task: string;
  data: any; // e.g. { status: string, progress: number }
}

export type ProgressListener = (progress: AiProgress) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  onProgress?: ProgressListener;
}

let worker: Worker | null = null;
const pendingRequests = new Map<string, PendingRequest>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      const { type, id, result, error, task, data } = event.data;
      const request = pendingRequests.get(id);

      if (!request) return;

      if (type === 'result') {
        request.resolve(result);
        pendingRequests.delete(id);
      } else if (type === 'error') {
        request.reject(new Error(error));
        pendingRequests.delete(id);
      } else if (type === 'progress') {
        request.onProgress?.({ task, data });
      }
    };

    worker.onerror = (err) => {
      console.error('AI Worker error:', err);
    };
  }
  return worker;
}

function sendRequest<T>(
  type: string,
  payload: any,
  onProgress?: ProgressListener
): Promise<T> {
  const id = crypto.randomUUID();
  const worker = getWorker();

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject, onProgress });
    worker.postMessage({ type, id, ...payload });
  });
}

export async function summarise(
  text: string,
  options?: any,
  onProgress?: ProgressListener
): Promise<any> {
  return sendRequest('summarise', { text, options }, onProgress);
}

export async function classify(
  text: string,
  labels: string[],
  multi_label: boolean,
  onProgress?: ProgressListener
): Promise<any> {
  return sendRequest('classify', { text, labels, multi_label }, onProgress);
}

export async function findRelated(
  currentContent: string,
  candidates: Array<{ path: string; title: string; content: string }>,
  onProgress?: ProgressListener
): Promise<any> {
  return sendRequest('related', { currentContent, candidates }, onProgress);
}

export function terminate() {
  if (worker) {
    worker.terminate();
    worker = null;
    // Reject all pending requests
    for (const [id, req] of pendingRequests) {
      req.reject(new Error('Worker terminated'));
    }
    pendingRequests.clear();
  }
}
