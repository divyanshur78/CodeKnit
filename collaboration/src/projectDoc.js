import * as Y from "yjs";

export const FILES_KEY = "files";
export const PROJECT_KEY = "project";

export function createProjectDoc(options = {}) {
  const doc = new Y.Doc(options);
  doc.getMap(FILES_KEY);
  doc.getMap(PROJECT_KEY);
  return doc;
}

export function addFile(doc, { id, name, language = "plaintext", content = "" }) {
  if (!id || typeof id !== "string") throw new Error("A unique file ID is required.");
  if (!name || typeof name !== "string") throw new Error("A file name is required.");
  if (typeof content !== "string") throw new Error("File content must be a string.");

  const files = doc.getMap(FILES_KEY);
  if (files.has(id)) throw new Error(`File already exists: ${id}`);

  const file = new Y.Map();
  const text = new Y.Text();

  file.set("id", id);
  file.set("name", name);
  file.set("language", language);
  file.set("content", text);

  if (content.length) text.insert(0, content);

  files.set(id, file);
  return file;
}

export function getFile(doc, fileId) {
  return doc.getMap(FILES_KEY).get(fileId) ?? null;
}

export function getFileContent(doc, fileId) {
  return getFile(doc, fileId)?.get("content") ?? null;
}

export function renameFile(doc, fileId, newName) {
  if (!newName || typeof newName !== "string") throw new Error("A valid file name is required.");
  const file = getFile(doc, fileId);
  if (!file) return false;
  file.set("name", newName);
  return true;
}

export function updateFileLanguage(doc, fileId, language) {
  if (!language || typeof language !== "string") throw new Error("A valid language is required.");
  const file = getFile(doc, fileId);
  if (!file) return false;
  file.set("language", language);
  return true;
}

export function deleteFile(doc, fileId) {
  const files = doc.getMap(FILES_KEY);
  if (!files.has(fileId)) return false;
  files.delete(fileId);
  return true;
}

export function listFiles(doc) {
  return Array.from(doc.getMap(FILES_KEY).values(), file => ({
    id: file.get("id"),
    name: file.get("name"),
    language: file.get("language"),
    content: file.get("content").toString()
  }));
}
