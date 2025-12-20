// Mock AI Tag Suggestions
// In the future, this will connect to the AI model or worker.

export async function suggestTags(_title: string, _content: string): Promise<string[]> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return mock suggestions
    return ['important', 'review', 'draft', 'ideas'];
}
