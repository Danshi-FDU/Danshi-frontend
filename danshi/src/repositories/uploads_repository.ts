import { API_ENDPOINTS, USE_MOCK } from '@/src/constants/app';
import { httpAuth } from '@/src/lib/http/http_auth';
import { unwrapApiResponse, type ApiResponse } from '@/src/lib/http/response';

export type UploadFilePayload =
  | { name: string; type: string; uri: string; blob?: never }
  | { name: string; type: string; uri?: never; blob: Blob };

export type UploadImageResult = {
  url: string;
  filename: string;
  size: number;
};

export interface UploadsRepository {
  uploadImage(file: UploadFilePayload): Promise<UploadImageResult>;
  uploadImages(files: UploadFilePayload[]): Promise<UploadImageResult[]>;
}

function appendFile(form: FormData, field: string, payload: UploadFilePayload) {
  if ('uri' in payload) {
    form.append(field, {
      uri: payload.uri,
      name: payload.name,
      type: payload.type,
    } as any);
    return;
  }
  form.append(field, payload.blob, payload.name);
}

function buildFormData(field: string, payloads: UploadFilePayload[]): FormData {
  if (!payloads.length) throw new Error('缺少文件');
  const form = new FormData();
  payloads.forEach((p) => appendFile(form, field, p));
  return form;
}

class ApiUploadsRepository implements UploadsRepository {
  async uploadImage(file: UploadFilePayload): Promise<UploadImageResult> {
    throw new Error('Upload API not implemented');
    // const form = buildFormData('file', [file]);
    // const resp = await httpAuth.post<ApiResponse<UploadImageResult>>(API_ENDPOINTS.UPLOAD.IMAGE, form);
    // return unwrapApiResponse<UploadImageResult>(resp, 200);
  }

  async uploadImages(files: UploadFilePayload[]): Promise<UploadImageResult[]> {
    throw new Error('Upload API not implemented');
    // const form = buildFormData('files', files);
    // const resp = await httpAuth.post<ApiResponse<{ urls: UploadImageResult[] }>>(API_ENDPOINTS.UPLOAD.IMAGES, form);
    // const result = unwrapApiResponse<{ urls: UploadImageResult[] }>(resp, 200);
    // return result?.urls ?? [];
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MockUploadsRepository implements UploadsRepository {
  private seq = 0;

  private nextUrl(name: string) {
    this.seq += 1;
    return `https://mock-storage.dawn-eat.com/${Date.now()}-${this.seq}-${encodeURIComponent(name)}`;
  }

  async uploadImage(file: UploadFilePayload): Promise<UploadImageResult> {
    await delay(120);
    const filename = file.name || `mock-${Date.now()}.jpg`;
    const blobSize = 'blob' in file && file.blob ? file.blob.size : 0;
    return {
      url: this.nextUrl(filename),
      filename,
      size: blobSize,
    };
  }

  async uploadImages(files: UploadFilePayload[]): Promise<UploadImageResult[]> {
    const results: UploadImageResult[] = [];
    for (const file of files) {
      results.push(await this.uploadImage(file));
    }
    return results;
  }
}

export const uploadsRepository: UploadsRepository = USE_MOCK ? new MockUploadsRepository() : new ApiUploadsRepository();
