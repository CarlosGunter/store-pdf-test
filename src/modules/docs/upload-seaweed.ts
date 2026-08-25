import { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { tryCatch } from "src/utils/try-catch";

export interface UploadPdfProps {
    pdfBuffer: Buffer | Uint8Array;
    fileName: string;
    bucketName?: string;
}

export interface PresignedUrlProps {
    key: string;
    bucketName?: string;
    expiresIn?: number; // En segundos (por defecto 300 = 5 minutos)
}

const SEAWEEDFS_ENDPOINT = process.env.SEAWEEDFS_S3_ENDPOINT || "http://localhost:8333";
const SEAWEEDFS_ACCESS_KEY = process.env.SEAWEEDFS_ACCESS_KEY || "admin_access_key";
const SEAWEEDFS_SECRET_KEY = process.env.SEAWEEDFS_SECRET_KEY || "admin_secret_key";
const SEAWEEDFS_REGION = process.env.SEAWEEDFS_REGION || "us-east-1";
const DEFAULT_BUCKET = process.env.SEAWEEDFS_BUCKET || "diplomas";

export function getSeaweedS3Client(): S3Client {
    return new S3Client({
        endpoint: SEAWEEDFS_ENDPOINT,
        region: SEAWEEDFS_REGION,
        credentials: {
            accessKeyId: SEAWEEDFS_ACCESS_KEY,
            secretAccessKey: SEAWEEDFS_SECRET_KEY,
        },
        forcePathStyle: true,
    });
}

export async function ensureBucketExists(s3Client: S3Client, bucketName: string): Promise<boolean> {
    const { error: headError } = await tryCatch(
        s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
    );

    if (!headError) {
        return true;
    }

    console.log(`Bucket '${bucketName}' no existe o no se tiene acceso. Intentando crearlo...`);

    const { error: createError } = await tryCatch(
        s3Client.send(new CreateBucketCommand({ Bucket: bucketName }))
    );

    if (createError) {
        console.error(`Error al crear el bucket '${bucketName}' en SeaweedFS:`, createError);
        return false;
    }

    console.log(`Bucket '${bucketName}' creado exitosamente en SeaweedFS.`);
    return true;
}

export async function uploadPdfToSeaweed({
    pdfBuffer,
    fileName,
    bucketName = DEFAULT_BUCKET,
}: UploadPdfProps) {
    const s3Client = getSeaweedS3Client();

    const bucketReady = await ensureBucketExists(s3Client, bucketName);
    if (!bucketReady) {
        return {
            success: false,
            error: `No se pudo asegurar la existencia del bucket '${bucketName}'`,
        };
    }

    const { data: response, error: uploadError } = await tryCatch(
        s3Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: pdfBuffer,
                ContentType: "application/pdf",
            })
        )
    );

    if (uploadError) {
        console.error(`Error al subir el archivo '${fileName}' a SeaweedFS:`, uploadError);
        return {
            success: false,
            error: uploadError,
        };
    }

    const fileUrl = `${SEAWEEDFS_ENDPOINT}/${bucketName}/${fileName}`;
    console.log(`Archivo '${fileName}' guardado exitosamente en SeaweedFS:`, fileUrl);

    return {
        success: true,
        bucket: bucketName,
        key: fileName,
        url: fileUrl,
        response,
    };
}

/**
 * Genera una URL temporal firmada (Presigned URL) para consultar o descargar el PDF.
 */
export async function getPresignedPdfUrl({
    key,
    bucketName = DEFAULT_BUCKET,
    expiresIn = 300, // 5 minutos por defecto
}: PresignedUrlProps) {
    const s3Client = getSeaweedS3Client();

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    const { data: presignedUrl, error } = await tryCatch(
        getSignedUrl(s3Client as any, command as any, { expiresIn })
    );

    if (error || !presignedUrl) {
        console.error(`Error al generar URL firmada para '${key}':`, error);
        return {
            success: false,
            error,
        };
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
        success: true,
        url: presignedUrl,
        expiresIn,
        expiresAt,
    };
}

/**
 * Verifica si un archivo existe en SeaweedFS y obtiene sus metadatos.
 */
export async function checkPdfExists({
    key,
    bucketName = DEFAULT_BUCKET,
}: {
    key: string;
    bucketName?: string;
}) {
    const s3Client = getSeaweedS3Client();

    const { data: headData, error } = await tryCatch(
        s3Client.send(
            new HeadObjectCommand({
                Bucket: bucketName,
                Key: key,
            })
        )
    );

    if (error || !headData) {
        return {
            exists: false,
            error,
        };
    }

    return {
        exists: true,
        contentLength: headData.ContentLength,
        lastModified: headData.LastModified,
        contentType: headData.ContentType,
    };
}
