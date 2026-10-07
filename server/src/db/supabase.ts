import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseServiceKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-supabase')
  );
};

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('✅ Supabase Client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client:', err);
    supabaseInstance = null;
  }
} else {
  console.log('ℹ️ Supabase credentials pending in .env. Running in local mode with automatic sync capability.');
}

export const supabase = supabaseInstance;

/**
 * Upload a file buffer to a Supabase Storage bucket
 */
export async function uploadToSupabaseStorage(
  bucketName: 'emergency-images' | 'emergency-audio' | 'evidence-files',
  filePath: string,
  fileBuffer: Buffer,
  contentType?: string
): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error(`Error uploading file to Supabase bucket ${bucketName}:`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error('Supabase storage upload exception:', err.message);
    return null;
  }
}
