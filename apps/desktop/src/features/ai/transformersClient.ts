import {
  pipeline,
  type SummarizationPipeline,
  type ZeroShotClassificationPipeline,
  type FeatureExtractionPipeline
} from '@huggingface/transformers';

// Global cache for pipelines
let summarisationPipeline: SummarizationPipeline | null = null;
let classificationPipeline: ZeroShotClassificationPipeline | null = null;
let embeddingPipeline: FeatureExtractionPipeline | null = null;

// Models
const SUMMARISATION_MODEL = 'Xenova/distilbart-cnn-6-6';
const CLASSIFICATION_MODEL = 'Xenova/mobilebert-uncased-mnli';
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

export async function getSummarisationPipeline(): Promise<SummarizationPipeline> {
  if (!summarisationPipeline) {
    console.log(`[ai] Loading summarisation model: ${SUMMARISATION_MODEL}`);
    // Cast via unknown to handle complex union return type
    summarisationPipeline = (await pipeline('summarization', SUMMARISATION_MODEL)) as unknown as SummarizationPipeline;
  }
  return summarisationPipeline;
}

export async function getClassificationPipeline(): Promise<ZeroShotClassificationPipeline> {
  if (!classificationPipeline) {
    console.log(`[ai] Loading classification model: ${CLASSIFICATION_MODEL}`);
    classificationPipeline = (await pipeline('zero-shot-classification', CLASSIFICATION_MODEL)) as unknown as ZeroShotClassificationPipeline;
  }
  return classificationPipeline;
}

export async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    console.log(`[ai] Loading embedding model: ${EMBEDDING_MODEL}`);
    embeddingPipeline = (await pipeline('feature-extraction', EMBEDDING_MODEL)) as unknown as FeatureExtractionPipeline;
  }
  return embeddingPipeline;
}
