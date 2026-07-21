import { upload } from '@vercel/blob/client';

async function requestUploadPlan(file, metadata, assetType) {
  const response = await fetch('/api/media/upload-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      assetType,
      metadata: { ...metadata, contentType: file.type }
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No fue posible preparar la carga.');
  return body;
}

window.rayoBlobUpload = async function rayoBlobUpload(file, metadata = {}, onUploadProgress, assetType = 'media') {
  const plan = await requestUploadPlan(file, metadata, assetType);
  return upload(plan.storageKey, file, {
    access: 'public',
    handleUploadUrl: '/api/media/blob-upload',
    multipart: file.size > 4 * 1024 * 1024,
    contentType: plan.contentType,
    clientPayload: JSON.stringify({
      assetType: plan.assetType,
      storageKey: plan.storageKey,
      originalName: file.name,
      contentType: plan.contentType,
      sizeBytes: file.size,
      metadata: { ...metadata, contentType: plan.contentType }
    }),
    onUploadProgress
  });
};
