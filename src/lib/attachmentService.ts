const API = '/api/attachments';

export interface Attachment {
    id: number;
    public_id: string;
    url: string;
    filename: string;
    file_type: string;
    size_bytes: number;
    uploaded_at: number;
}

export async function listAttachments(noteKey: string): Promise<Attachment[]> {
    const res = await fetch(`${API}/${encodeURIComponent(noteKey)}`);
    if (!res.ok) throw new Error('Failed to load attachments');
    const data = await res.json();
    return data.attachments as Attachment[];
}

export async function uploadAttachment(
    noteKey: string,
    file: File,
    onProgress?: (percent: number) => void
): Promise<Attachment> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API}/${encodeURIComponent(noteKey)}`);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch {
                    reject(new Error('Invalid server response'));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error || 'Upload failed'));
                } catch {
                    reject(new Error('Upload failed'));
                }
            }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        const form = new FormData();
        form.append('file', file);
        xhr.send(form);
    });
}

export async function deleteAttachment(noteKey: string, id: number): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(noteKey)}/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Delete failed');
}
