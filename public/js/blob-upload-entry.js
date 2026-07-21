import { upload } from '@vercel/blob/client';

async function requestUploadPlan(file, metadata) {
  const response = await fetch('/api/media/upload-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      metadata: { ...metadata, contentType: file.type }
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No fue posible preparar la carga.');
  return body;
}

window.rayoBlobUpload = async function rayoBlobUpload(file, metadata, onUploadProgress) {
  const plan = await requestUploadPlan(file, metadata);
  return upload(plan.storageKey, file, {
    access: 'public',
    handleUploadUrl: '/api/media/blob-upload',
    multipart: file.size > 4 * 1024 * 1024,
    contentType: file.type,
    clientPayload: JSON.stringify({ ...metadata, contentType: file.type, storageKey: plan.storageKey }),
    onUploadProgress
  });
};
