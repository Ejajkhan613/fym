const { randomUUID } = require("crypto");
const path = require("path");
const createError = require("http-errors");
const {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/g, "");
}

function getFileExtension(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(extension)) {
    return extension;
  }

  if (file.mimetype === "application/pdf") return ".pdf";
  if (file.mimetype === "image/png") return ".png";
  if (file.mimetype === "image/webp") return ".webp";
  return ".jpg";
}

function buildPublicFileUrl({ bucket, endpoint, key, publicBaseUrl, region }) {
  if (publicBaseUrl) {
    return `${trimTrailingSlash(publicBaseUrl)}/${trimSlashes(key)}`;
  }

  if (endpoint) {
    return `${trimTrailingSlash(endpoint)}/${bucket}/${trimSlashes(key)}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${trimSlashes(key)}`;
}

function removePrefix(value, prefix) {
  if (!prefix || !value.startsWith(prefix)) return null;
  return trimSlashes(value.slice(prefix.length));
}

class PrescriptionFileStorage {
  constructor({ env = process.env, s3Client } = {}) {
    this.bucket = env.S3_BUCKET;
    this.region = env.S3_REGION || "ap-south-1";
    this.endpoint = env.S3_ENDPOINT || "";
    this.publicBaseUrl = env.S3_PUBLIC_BASE_URL || "";
    this.maxFileSizeBytes = Number(
      env.PRESCRIPTION_UPLOAD_MAX_BYTES || DEFAULT_MAX_FILE_SIZE_BYTES,
    );

    this.s3Client =
      s3Client ||
      new S3Client({
        region: this.region,
        ...(this.endpoint ? { endpoint: this.endpoint } : {}),
        ...(env.S3_FORCE_PATH_STYLE === "true" ? { forcePathStyle: true } : {}),
        ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
              },
            }
          : {}),
      });
  }

  async uploadPrescriptionFile({ customerId, file }) {
    if (!this.bucket) {
      throw createError(500, "S3 bucket is not configured");
    }

    if (!file?.buffer?.length) {
      throw createError(400, "Prescription file is required");
    }

    if (file.size > this.maxFileSizeBytes) {
      throw createError(413, "Prescription file is too large");
    }

    const key = [
      "prescriptions",
      customerId,
      `${Date.now()}-${randomUUID()}${getFileExtension(file)}`,
    ].join("/");

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
      }),
    );

    return {
      key,
      fileUrl: buildPublicFileUrl({
        bucket: this.bucket,
        endpoint: this.endpoint,
        key,
        publicBaseUrl: this.publicBaseUrl,
        region: this.region,
      }),
    };
  }

  async deletePrescriptionFile({ fileUrl }) {
    if (!this.bucket) {
      return false;
    }

    const key = this.getObjectKeyFromUrl(fileUrl);

    if (!key) {
      return false;
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return true;
  }

  getObjectKeyFromUrl(fileUrl) {
    if (!fileUrl) return null;

    if (this.publicBaseUrl) {
      const key = removePrefix(
        fileUrl,
        `${trimTrailingSlash(this.publicBaseUrl)}/`,
      );
      if (key) return decodeURIComponent(key);
    }

    try {
      const url = new URL(fileUrl);
      const pathname = trimSlashes(url.pathname);

      if (this.endpoint) {
        const endpointUrl = new URL(this.endpoint);

        if (url.origin === endpointUrl.origin) {
          const bucketPrefix = `${this.bucket}/`;
          return decodeURIComponent(
            pathname.startsWith(bucketPrefix)
              ? pathname.slice(bucketPrefix.length)
              : pathname,
          );
        }
      }

      if (url.hostname.startsWith(`${this.bucket}.s3.`)) {
        return decodeURIComponent(pathname);
      }

      const bucketPrefix = `${this.bucket}/`;
      if (pathname.startsWith(bucketPrefix)) {
        return decodeURIComponent(pathname.slice(bucketPrefix.length));
      }
    } catch {
      return null;
    }

    return null;
  }
}

module.exports = {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  PrescriptionFileStorage,
};
