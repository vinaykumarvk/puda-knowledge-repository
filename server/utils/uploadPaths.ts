import path from "node:path";

/**
 * Get the upload directory for documents
 * In production (Cloud Run), uses /tmp (ephemeral storage)
 * In development, uses uploads/documents relative to project root
 */
export function getUploadDir(): string {
  return process.env.NODE_ENV === 'production' 
    ? '/tmp/uploads/documents' 
    : path.join(process.cwd(), 'uploads', 'documents');
}

/**
 * Get the full path to an uploaded file
 */
export function getUploadFilePath(filename: string): string {
  return path.join(getUploadDir(), filename);
}

/**
 * Get the base uploads directory
 */
export function getUploadsBaseDir(): string {
  return process.env.NODE_ENV === 'production'
    ? '/tmp/uploads'
    : path.join(process.cwd(), 'uploads');
}

