import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { uploadMultipartWithProgress } from '../../src/lib/mediaUploadService';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('mediaUploadService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts multipart data with timeout and progress callback', async () => {
    const onProgress = vi.fn();
    const formData = new FormData();
    formData.append('file', new Blob(['data']), 'image.png');

    vi.mocked(axios.post).mockImplementation(async (_url, _body, config) => {
      config?.onUploadProgress?.({ loaded: 50, total: 100 } as never);
      return { data: { secure_url: 'https://cdn.example.com/file.png' } } as never;
    });

    const result = await uploadMultipartWithProgress<{ secure_url: string }>(
      'https://upload.example.com',
      formData,
      {
        timeout: 1200,
        onProgress,
      }
    );

    expect(result.secure_url).toBe('https://cdn.example.com/file.png');
    expect(axios.post).toHaveBeenCalledWith(
      'https://upload.example.com',
      formData,
      expect.objectContaining({
        timeout: 1200,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    expect(onProgress).toHaveBeenCalledWith(50);
  });
});
