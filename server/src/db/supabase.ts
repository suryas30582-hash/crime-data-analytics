import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

// On backend, prioritize service role key for full administrative bypass of RLS and storage bucket creation
const effectiveKey = supabaseServiceKey || supabaseAnonKey;

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseServiceKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-supabase')
  );
};

export function validateSupabaseConfig(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = isSupabaseConfigured();

  if (configured) {
    console.log('✅ Supabase Storage Client initialized with Service Role credentials. Persistent media storage ready.');
    return true;
  }

  if (isProd) {
    console.error('🚨 [CRITICAL CONFIG ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are REQUIRED in production!');
    console.error('🚨 Production cannot use ephemeral local disk for emergency media persistence.');
  } else {
    console.warn('⚠️ [DEV NOTICE] Supabase credentials missing or pending in server/.env.');
    console.warn('⚠️ Local filesystem fallback (/uploads/emergency) will be used for local development.');
  }
  return false;
}

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && effectiveKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('your-supabase')) {
  try {
    supabaseInstance = createClient(supabaseUrl, effectiveKey, {
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
  validateSupabaseConfig();
}

export const supabase = supabaseInstance;

export const REQUIRED_BUCKETS = ['emergency-images', 'emergency-audio', 'evidence-files'] as const;
export type StorageBucketName = typeof REQUIRED_BUCKETS[number];

let bucketsChecked = false;

/**
 * Check whether required storage buckets exist; if missing, create them with public read access
 */
export async function ensureStorageBuckets(): Promise<void> {
  if (!supabaseInstance) return;

  try {
    const { data: buckets, error } = await supabaseInstance.storage.listBuckets();
    if (error) {
      console.warn('⚠️ [Storage] Could not list storage buckets:', error.message);
      return;
    }

    const existingBucketNames = new Set((buckets || []).map(b => b.name));

    for (const bucketName of REQUIRED_BUCKETS) {
      if (!existingBucketNames.has(bucketName)) {
        console.log(`ℹ️ [Storage] Bucket "${bucketName}" not found. Creating public bucket...`);
        const { error: createError } = await supabaseInstance.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });

        if (createError) {
          console.error(`🚨 [Storage] Failed to create bucket "${bucketName}":`, createError.message);
        } else {
          console.log(`✅ [Storage] Bucket "${bucketName}" created successfully with public access.`);
        }
      }
    }
    bucketsChecked = true;
  } catch (err: any) {
    console.warn('⚠️ [Storage] Exception during bucket verification:', err?.message || err);
  }
}

/**
 * Upload a file buffer to a Supabase Storage bucket and return the public URL
 */
export async function uploadToSupabaseStorage(
  bucketName: StorageBucketName,
  filePath: string,
  fileBuffer: Buffer,
  contentType?: string
): Promise<string | null> {
  if (!supabaseInstance) {
    console.warn(`[Storage Upload] Supabase not initialized. Cannot upload ${filePath} to ${bucketName}.`);
    return null;
  }

  // Ensure buckets exist on first upload if not already verified
  if (!bucketsChecked) {
    await ensureStorageBuckets();
  }

  try {
    const cleanContentType = contentType || 'application/octet-stream';
    const { data, error } = await supabaseInstance.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: cleanContentType,
        upsert: true
      });

    if (error) {
      console.error(`Error uploading file to Supabase bucket ${bucketName} (${filePath}):`, error.message);
      // If error might be missing bucket, re-check buckets and retry once
      if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('bucket')) {
        console.log(`[Storage Upload] Re-verifying buckets and retrying upload for ${bucketName}...`);
        await ensureStorageBuckets();
        const retryResult = await supabaseInstance.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: cleanContentType,
            upsert: true
          });
        if (retryResult.error) {
          console.error(`Retry upload failed: ${retryResult.error.message}`);
          return null;
        }
        const { data: pubData } = supabaseInstance.storage.from(bucketName).getPublicUrl(retryResult.data.path);
        return pubData?.publicUrl || null;
      }
      return null;
    }

    const { data: publicUrlData } = supabaseInstance.storage.from(bucketName).getPublicUrl(data.path);
    return publicUrlData?.publicUrl || null;
  } catch (err: any) {
    console.error('Supabase storage upload exception:', err?.message || err);
    return null;
  }
}

/**
 * Safely delete a file from Supabase Storage by filename or full public URL
 */
export async function deleteFromSupabaseStorage(
  bucketName: StorageBucketName,
  filePathOrUrl: string
): Promise<boolean> {
  if (!supabaseInstance || !filePathOrUrl) return false;

  try {
    let objectPath = filePathOrUrl.trim();
    if (objectPath.startsWith('http')) {
      const match = objectPath.match(new RegExp(`/storage/v1/object/public/${bucketName}/(.+)$`));
      if (match && match[1]) {
        objectPath = decodeURIComponent(match[1]);
      } else {
        const parts = objectPath.split(`/${bucketName}/`);
        if (parts.length > 1) {
          objectPath = decodeURIComponent(parts[parts.length - 1]);
        }
      }
    }

    const { error } = await supabaseInstance.storage.from(bucketName).remove([objectPath]);
    if (error) {
      console.warn(`[Storage Delete] Failed removing ${objectPath} from ${bucketName}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Storage Delete Exception]:', err?.message || err);
    return false;
  }
}
