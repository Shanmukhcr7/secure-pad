import { encryptNote, decryptNote } from './crypto';
import { getToken } from './authService';

const API_URL = '';

export interface StoredNote {
  noteKey: string;
  encryptedContent: string;
  createdAt: number;
  expiryTime: number | null;
  oneTimeView: boolean;
  viewed: boolean;
}

export async function noteExists(key: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(key)}`);
  const data = await res.json();
  return data.exists === true;
}

export async function createNote(
  key: string,
  content: string,
  passphrase: string,
  options: { oneTimeView?: boolean; expiryHours?: number; noteTitle?: string } = {}
): Promise<void> {
  const encryptedContent = await encryptNote(content, passphrase);
  const expiryTime = options.expiryHours
    ? Date.now() + options.expiryHours * 60 * 60 * 1000
    : null;

  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key,
      encryptedContent,
      expiryTime,
      oneTimeView: options.oneTimeView || false,
      noteTitle: options.noteTitle ?? key,
    }),
  });
  if (!res.ok) throw new Error('Failed to save note');
}


export async function viewNote(noteKey: string, passphrase: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(noteKey)}`);
  const data = await res.json();

  if (!data.exists) throw new Error('Note not found or has expired');

  const content = await decryptNote(data.encryptedContent, passphrase);

  // If one-time view, delete from server after successful decrypt
  if (data.oneTimeView) {
    await fetch(`${API_URL}/api/notes/${encodeURIComponent(noteKey)}/viewed`, {
      method: 'PATCH',
    });
  }

  return content;
}

export async function updateNote(key: string, content: string, passphrase: string): Promise<void> {
  const encryptedContent = await encryptNote(content, passphrase);
  const res = await fetch(`${API_URL}/api/notes/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedContent }),
  });
  if (!res.ok) throw new Error('Failed to update note');
}

export async function deleteNote(noteKey: string): Promise<void> {
  await fetch(`${API_URL}/api/notes/${encodeURIComponent(noteKey)}`, {
    method: 'DELETE',
  });
}
