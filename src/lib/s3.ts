import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Create a singleton S3 client instance
export const s3Client = new S3Client({
  region: "us-east-005",
  credentials: {
    accessKeyId: String(process.env.BLACKBLAZE_KEY_ID),
    secretAccessKey: String(process.env.BLACKBLAZE_API_KEY),
  },
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  forcePathStyle: true,
});

export const uploadFile = async ({
  file,
  keyName,
}: {
  file: File;
  keyName: string;
}) => {
  console.log(`Uploading file: ${file.name}`);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const response = await s3Client.send(
      new PutObjectCommand({
        Bucket: String(process.env.B2_BUCKET_NAME),
        Key: keyName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    console.log(`Success! Response is: ${JSON.stringify(response, null, 2)}`);

    // Return the friendly URL
    return getFriendlyUrl(keyName);
  } catch (err) {
    console.error("Error uploading file:", err);
    throw err;
  }
};

export const getPresignedUrl = async ({
  keyName,
  expiresIn = 3600,
}: {
  keyName: string;
  expiresIn?: number;
}) => {
  try {
    const command = new GetObjectCommand({
      Bucket: String(process.env.B2_BUCKET_NAME),
      Key: keyName,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (err) {
    console.error("Error generating presigned URL:", err);
    throw err;
  }
};

// Helper function to get friendly URL
export const getFriendlyUrl = (keyName: string) => {
  // You can replace this with your custom domain if you have one set up
  const friendlyDomain = "f005.backblazeb2.com";
  const bucketName = String(process.env.B2_BUCKET_NAME).toLowerCase();
  return `https://${friendlyDomain}/file/${bucketName}/${keyName}`;
};
