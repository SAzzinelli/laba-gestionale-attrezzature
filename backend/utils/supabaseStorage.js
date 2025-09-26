// backend/utils/supabaseStorage.js - Gestione Supabase Storage
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://kzqabwmtpmlhaueqiuoc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cWFid210cG1saGF1ZXFpdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjQ4NzEsImV4cCI6MjA1MDkwMDg3MX0.8Qj6bFqMXLt_RqGu0MmqN1gb436H1vYcKLCB8cmTLIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Upload file a Supabase Storage
export async function uploadFile(bucket, filePath, fileBuffer, contentType) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        upsert: true // Sovrascrive se esiste già
      });

    if (error) {
      console.error('Errore upload Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Errore upload file:', error);
    throw error;
  }
}

// Download file da Supabase Storage
export async function downloadFile(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Errore download Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Errore download file:', error);
    throw error;
  }
}

// Elimina file da Supabase Storage
export async function deleteFile(bucket, filePath) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Errore eliminazione Supabase:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Errore eliminazione file:', error);
    throw error;
  }
}

// Ottieni URL pubblico del file
export function getPublicUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default supabase;
