import { useState, useCallback } from "react";
import { readNote, writeNote } from "../commands";
import { usePluginHost } from "../plugins/PluginHostProvider";
import { useLinkIndex } from "../components/LinkIndexContext";
import { useSearchIndex } from "../components/SearchIndexContext";
import { useNotification } from "../components/NotificationContext";

export function useNote() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isLoadingNote, setIsLoadingNote] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const { notifyNoteOpened, notifyNoteContentChanged, notifyNoteSaved } = usePluginHost();
  const { updateNote } = useLinkIndex();
  const { updateEntry: updateSearchEntry } = useSearchIndex();
  const { notify } = useNotification();

  const handleFileSelect = useCallback(async (path: string) => {
    setSelectedFile(path);
    setIsLoadingNote(true);
    setNoteContent("");
    setIsDirty(false);

    try {
      const content = await readNote(path);
      setNoteContent(content);

      notifyNoteOpened({
        path,
        title: path.split('/').pop()?.replace('.md', '') || path,
        content
      });
    } catch (err) {
      notify("Failed to read note: " + String(err), 'error');
    } finally {
      setIsLoadingNote(false);
    }
  }, [notifyNoteOpened, notify]);

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      await writeNote(selectedFile, noteContent);
      setIsDirty(false);
      updateNote(selectedFile, noteContent);
      updateSearchEntry(selectedFile, noteContent);

      notifyNoteSaved({
        path: selectedFile,
        title: selectedFile.split('/').pop()?.replace('.md', '') || selectedFile,
        content: noteContent
      });
      notify("Note saved", 'success', 2000);
    } catch (err) {
      notify("Failed to save: " + String(err), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, noteContent, notifyNoteSaved, updateNote, updateSearchEntry, notify]);

  const updateContent = useCallback((newContent: string) => {
    setNoteContent(newContent);
    setIsDirty(true);
    if (selectedFile) {
      notifyNoteContentChanged({
        path: selectedFile,
        title: selectedFile.split('/').pop()?.replace('.md', '') || selectedFile,
        content: newContent
      });
    }
  }, [selectedFile, notifyNoteContentChanged]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setNoteContent("");
    setIsDirty(false);
  }, []);

  return {
    selectedFile,
    noteContent,
    isDirty,
    isLoadingNote,
    isSaving,
    handleFileSelect,
    handleSave,
    updateContent,
    clearSelection
  };
}
