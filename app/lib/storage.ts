import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function buildEndpoint(): string {
  const host   = process.env.MINIO_ENDPOINT!
  const port   = process.env.MINIO_PORT
  const ssl    = process.env.MINIO_USE_SSL === 'true'
  const scheme = ssl ? 'https' : 'http'
  // Omit port when using defaults (443 for HTTPS, 80 for HTTP) — needed for R2 and other hosted S3
  if (!port || (ssl && port === '443') || (!ssl && port === '80')) {
    return `${scheme}://${host}`
  }
  return `${scheme}://${host}:${port}`
}

const s3 = new S3Client({
  endpoint: buildEndpoint(),
  region: process.env.MINIO_REGION ?? 'auto',
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.MINIO_BUCKET!

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return key
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  )
}

export async function fetchFile(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as any) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export function buildKey(orgSlug: string, ...parts: string[]): string {
  return [orgSlug, ...parts].join('/')
}
