import {
    pipeline,
    env,
    type SummarizationPipeline,
    type ZeroShotClassificationPipeline,
    type FeatureExtractionPipeline
} from '@huggingface/transformers';

// Configure environment if needed (optional, keeping defaults usually works)
// env.allowLocalModels = false;
env.allowRemoteModels = true;

// Models
const SUMMARISATION_MODEL = 'Xenova/distilbart-cnn-6-6';
const CLASSIFICATION_MODEL = 'Xenova/mobilebert-uncased-mnli';
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Cache
let summarisationPipeline: SummarizationPipeline | null = null;
let classificationPipeline: ZeroShotClassificationPipeline | null = null;
let embeddingPipeline: FeatureExtractionPipeline | null = null;

export enum AiTaskType {
    Summarise = 'summarise',
    Classify = 'classify',
    Related = 'related'
}

export interface AiProgress {
    task: string;
    data: any; // e.g. { status: string, progress: number }
}

// Types
type WorkerMessage =
    | { type: AiTaskType.Summarise; id: string; text: string; options?: any }
    | { type: AiTaskType.Classify; id: string; text: string; labels: string[]; multi_label: boolean }
    | { type: AiTaskType.Related; id: string; currentContent: string; candidates: Array<{ path: string; title: string; content: string }> };

type ProgressCallback = (data: any) => void;

function sendProgress(id: string, task: string, data: any) {
    self.postMessage({
        type: 'progress',
        id,
        task,
        data
    });
}

async function getSummarisationPipe(progressCallback: ProgressCallback) {
    if (!summarisationPipeline) {
        summarisationPipeline = (await pipeline('summarization', SUMMARISATION_MODEL, {
            progress_callback: progressCallback
        })) as unknown as SummarizationPipeline;
    }
    return summarisationPipeline;
}

async function getClassificationPipe(progressCallback: ProgressCallback) {
    if (!classificationPipeline) {
        classificationPipeline = (await pipeline('zero-shot-classification', CLASSIFICATION_MODEL, {
            progress_callback: progressCallback
        })) as unknown as ZeroShotClassificationPipeline;
    }
    return classificationPipeline;
}

async function getEmbeddingPipe(progressCallback: ProgressCallback) {
    if (!embeddingPipeline) {
        embeddingPipeline = (await pipeline('feature-extraction', EMBEDDING_MODEL, {
            progress_callback: progressCallback
        })) as unknown as FeatureExtractionPipeline;
    }
    return embeddingPipeline;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const { type, id } = event.data;

    try {
        if (type === AiTaskType.Summarise) {
            const { text, options } = event.data;
            const pipe = await getSummarisationPipe((data) => sendProgress(id, 'loading-model', data));

            // Run inference
            // Note: pipe(text, options)
            const result = await pipe(text, options || {
                max_length: 100,
                min_length: 10
            });

            // Result is typically generic, cast to unknown then to expected shape
            // SummarizationOutput[]
            self.postMessage({ type: 'result', id, result });
        }
        else if (type === AiTaskType.Classify) {
            const { text, labels, multi_label } = event.data;
            const pipe = await getClassificationPipe((data) => sendProgress(id, 'loading-model', data));

            // pipe(text, candidate_labels, { multi_label })
            // We use 'any' cast for the pipe call to avoid strict signature issues if types are outdated
            const runPipe = pipe as unknown as (text: string, labels: string[], opts?: any) => Promise<any>;
            const result = await runPipe(text, labels, { multi_label });

            self.postMessage({ type: 'result', id, result });
        }
        else if (type === AiTaskType.Related) {
            const { currentContent, candidates } = event.data;
            const pipe = await getEmbeddingPipe((data) => sendProgress(id, 'loading-model', data));

            const embed = async (text: string) => {
                if (!text || text.trim().length === 0) return new Float32Array(384);
                const output = await pipe(text, { pooling: 'mean', normalize: true });
                // @ts-ignore
                return output.data as Float32Array;
            };

            sendProgress(id, 'embedding', { status: 'Embedding current note', progress: 0 });
            const currentVec = await embed(currentContent);

            const scoredNotes = [];
            const total = candidates.length;

            for (let i = 0; i < total; i++) {
                const candidate = candidates[i];
                if (candidate.content.length < 10) continue;

                if (i % 5 === 0) {
                     sendProgress(id, 'embedding', {
                         status: `Embedding note ${i + 1}/${total}`,
                         progress: (i / total) * 100
                     });
                }

                const candidateVec = await embed(candidate.content);
                const score = cosineSimilarity(Array.from(currentVec), Array.from(candidateVec));

                if (score > 0.2) {
                    scoredNotes.push({
                        path: candidate.path,
                        title: candidate.title,
                        score
                    });
                }
            }

            scoredNotes.sort((a, b) => b.score - a.score);
            self.postMessage({ type: 'result', id, result: scoredNotes.slice(0, 10) });
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ type: 'error', id, error: (error as Error).message });
    }
});
