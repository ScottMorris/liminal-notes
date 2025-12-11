// NOTE: This is a stub for Milestone 7. Real model loading happens in a later milestone.

import { pipeline, type Pipeline } from '@huggingface/transformers';

let summarisationPipeline: Pipeline | null = null;

export async function getSummarisationPipeline(): Promise<Pipeline | null> {
  console.log('[ai] getSummarisationPipeline called (stub in Milestone 7)');

  // In a later milestone, this will lazily load a real model, e.g.:
  // summarisationPipeline ??= await pipeline('summarization', 'Xenova/some-model');

  // To prevent unused variable warning for now (as we are importing pipeline but not using it yet)
  if (false) {
      await pipeline('summarization', 'dummy');
  }

  return summarisationPipeline;
}
