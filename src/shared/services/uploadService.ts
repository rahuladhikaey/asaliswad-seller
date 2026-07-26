import { supabase } from "../utils/supabaseClient";

/**
 * Helper to convert Base64/DataURL to Blob
 */
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1] || arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload file or base64 string directly to Supabase Storage Bucket
 */
export async function uploadToSupabaseBucket(
  bucketName: string,
  fileOrBase64: File | Blob | string,
  customFileName?: string
): Promise<string> {
  try {
    let blob: Blob;
    let contentType = "image/png";
    let fileExt = "png";

    if (typeof fileOrBase64 === "string") {
      if (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://")) {
        return fileOrBase64; // Already a URL
      }
      blob = dataURLtoBlob(fileOrBase64);
      contentType = blob.type || "image/png";
      fileExt = contentType.split("/")[1] || "png";
    } else {
      blob = fileOrBase64;
      contentType = (fileOrBase64 as File).type || "image/png";
      fileExt = (fileOrBase64 as File).name ? (fileOrBase64 as File).name.split(".").pop() || "png" : "png";
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = customFileName || `upload_${uniqueId}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType,
        upsert: true
      });

    if (error) {
      console.warn(`Notice uploading to Supabase bucket "${bucketName}":`, error.message);
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
      if (typeof fileOrBase64 === "string") return fileOrBase64;
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bprkenwmheakcqryjupi.supabase.co"}/storage/v1/object/public/${bucketName}/${filePath}`;
  } catch (err: any) {
    console.error("Supabase Storage upload error:", err);
    if (typeof fileOrBase64 === "string") return fileOrBase64;
    throw err;
  }
}

/**
 * Upload image to Cloudinary CDN
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string
): Promise<string> {
  try {
    if (typeof fileOrBase64 === "string" && (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))) {
      return fileOrBase64;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "p1ish280";
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "asaliswad_products";

    const formData = new FormData();
    formData.append("file", fileOrBase64);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (res.ok && data.secure_url) {
      return data.secure_url;
    }

    console.warn("Cloudinary upload notice:", data.error?.message || "Using Supabase Storage fallback");
    return await uploadToSupabaseBucket("product-images", fileOrBase64);
  } catch (err: any) {
    console.error("Cloudinary upload error, falling back to Supabase Bucket:", err);
    return await uploadToSupabaseBucket("product-images", fileOrBase64);
  }
}
