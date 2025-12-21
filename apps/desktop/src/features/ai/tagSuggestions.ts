import { suggestTagsForCurrentNote } from './aiController';
import { NoteSnapshot } from '../../plugins/types';

export async function suggestTags(title: string, content: string): Promise<string[]> {
    const dummyNote: NoteSnapshot = {
        path: 'dummy',
        title,
        content
    };

    try {
        const result = await suggestTagsForCurrentNote(dummyNote);
        return result.suggestions.map(s => s.tag);
    } catch (e) {
        console.error("AI suggestion failed", e);
        return [];
    }
}
