import axios from 'axios';

type UploadOptions = {
  timeout?: number;
  onProgress?: (progress: number) => void;
};

export async function uploadMultipartWithProgress<TResponse>(
  url: string,
  formData: FormData,
  options: UploadOptions = {}
): Promise<TResponse> {
  const response = await axios.post<TResponse>(url, formData, {
    timeout: options.timeout,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!event.total || !options.onProgress) return;
      options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });

  return response.data;
}
