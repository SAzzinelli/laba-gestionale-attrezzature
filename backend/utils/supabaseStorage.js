// backend/utils/supabaseStorage.js - Gestione Supabase Storage
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Configurazione Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://kzqabwmtpmlhaueqiuoc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cWFid210cG1saGF1ZXFpdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjQ4NzEsImV4cCI6MjA1MDkwMDg3MX0.8Qj6bFqMXLt_RqGu0MmqN1gb436H1vYcKLCB8cmTLIQ';

// Configurazione Storage S3-compatibile
const storageConfig = {
  endpoint: 'https://kzqabwmtpmlhaueqiuoc.storage.supabase.co/storage/v1/s3',
  region: 'eu-north-1',
  accessKeyId: '691b84b6f38906ede34b322272b930df',
  secretAccessKey: '403b92241f8caba92ccc04c5a0426f98a5c503c0a2216551bd28ee04d57dac2c'
};

const supabase = createClient(supabaseUrl, supabaseKey);

// Client S3 per Supabase Storage
const s3Client = new S3Client({
  endpoint: storageConfig.endpoint,
  region: storageConfig.region,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey
  },
  forcePathStyle: true // Necessario per Supabase Storage
});

// Upload file a Supabase Storage tramite S3
export async function uploadFile(bucket, filePath, fileBuffer, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: fileBuffer,
      ContentType: contentType
    });

    const result = await s3Client.send(command);
    console.log('File caricato su Supabase Storage:', result);
    
    return {
      path: filePath,
      fullPath: `${bucket}/${filePath}`,
      etag: result.ETag
    };
  } catch (error) {
    console.error('Errore upload file:', error);
    throw error;
  }
}

// Download file da Supabase Storage tramite S3
export async function downloadFile(bucket, filePath) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: filePath
    });

    const result = await s3Client.send(command);
    return result.Body;
  } catch (error) {
    console.error('Errore download file:', error);
    throw error;
  }
}

// Elimina file da Supabase Storage tramite S3
export async function deleteFile(bucket, filePath) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: filePath
    });

    await s3Client.send(command);
    console.log('File eliminato da Supabase Storage:', filePath);
    return true;
  } catch (error) {
    console.error('Errore eliminazione file:', error);
    throw error;
  }
}

// Ottieni URL pubblico del file
export function getPublicUrl(bucket, filePath) {
  // Per Supabase Storage, l'URL pubblico è costruito così:
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

export default supabase;
