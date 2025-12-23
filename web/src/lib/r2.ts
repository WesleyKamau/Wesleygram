import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.R2_SECRET_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET) {
  console.warn('R2 credentials missing in environment variables');
}

export const r2Client = new S3Client({
  region: 'us-east-1',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY || '',
    secretAccessKey: R2_SECRET_KEY || '',
  },
});

export async function getPresignedUrl(key: string) {
  if (!key) return null;
  
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    
    // Expires in 1 hour (3600 seconds)
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}
