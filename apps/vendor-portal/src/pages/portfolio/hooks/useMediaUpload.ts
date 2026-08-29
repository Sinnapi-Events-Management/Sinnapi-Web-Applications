import { useCallback, useEffect, useRef, useState } from 'react';
import type { UploadedFile } from '@sinnapi/ui';
import {
  currentUserId,
  portfolioBucket,
  removePortfolioObject,
  uploadPortfolioObject,
} from '@/lib/portfolioStorage';
import { portfolioObjectPath, preparePortfolioFile, validateMediaFile } from '../schema';
import type { MediaType } from '../schema';

/** One picked file, from the moment it is dropped to the row it becomes. */
export type StagedFile = {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  /** Local object URL, so the thumbnail appears before the upload finishes. */
  previewUrl?: string;
  /** Set once stored: what the row's `url` and `storage_path` will hold. */
  publicUrl?: string;
  bucket?: string;
  path?: string;
};

function stagedId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Picked files, on their way to storage.
 *
 * Bytes go up **as they are dropped**, not on submit. A 200 MB clip cannot sit
 * behind a Save button without the vendor wondering whether the app has frozen,
 * and uploading early is what lets each file report its own outcome — one
 * unreadable photo in a batch of twelve fails on its own line instead of taking
 * the other eleven down with it.
 *
 * The cost of that choice is orphans: an object exists before any row points at
 * it, so abandoning the dialog would strand it. `discard` is the answer, and the
 * dialog calls it on every exit that isn't a successful save.
 */
export function useMediaUpload(vendorId: string, mediaType: MediaType) {
  const [files, setFiles] = useState<StagedFile[]>([]);

  // Object URLs are revoked by hand; a batch of full-size photos held as blobs
  // is real memory, and the browser will not reclaim them on its own.
  const previewUrls = useRef(new Set<string>());
  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  const update = useCallback((id: string, patch: Partial<StagedFile>) => {
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, ...patch } : file)));
  }, []);

  const select = useCallback(
    async (picked: File[]) => {
      const owner = await currentUserId();
      if (!owner) {
        setFiles((current) => [
          ...current,
          ...picked.map((file) => ({
            id: stagedId(),
            name: file.name,
            size: file.size,
            status: 'error' as const,
            error: 'Your session has expired. Sign in again to upload.',
          })),
        ]);
        return;
      }

      const bucket = portfolioBucket(mediaType);

      for (const file of picked) {
        const id = stagedId();
        const rejection = validateMediaFile(file, mediaType);

        if (rejection) {
          setFiles((current) => [
            ...current,
            { id, name: file.name, size: file.size, status: 'error', error: rejection },
          ]);
          continue;
        }

        const previewUrl = mediaType === 'image' ? URL.createObjectURL(file) : undefined;
        if (previewUrl) previewUrls.current.add(previewUrl);

        setFiles((current) => [
          ...current,
          { id, name: file.name, size: file.size, status: 'uploading', previewUrl },
        ]);

        try {
          const { blob, extension } = await preparePortfolioFile(file, mediaType);
          const path = portfolioObjectPath(owner, vendorId, extension);
          const publicUrl = await uploadPortfolioObject(bucket, path, blob);
          update(id, { status: 'done', publicUrl, bucket, path, size: blob.size });
        } catch (cause) {
          update(id, {
            status: 'error',
            error: cause instanceof Error ? cause.message : 'Upload failed.',
          });
        }
      }
    },
    [mediaType, update, vendorId],
  );

  /** Drop one file, deleting its object if it had already been stored. */
  const remove = useCallback((id: string) => {
    setFiles((current) => {
      const target = current.find((file) => file.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrls.current.delete(target.previewUrl);
      }
      if (target?.bucket && target.path) void removePortfolioObject(target.bucket, target.path);
      return current.filter((file) => file.id !== id);
    });
  }, []);

  /** Clear the list, deleting anything already stored. Called on an abandoned dialog. */
  const discard = useCallback(() => {
    setFiles((current) => {
      current.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
          previewUrls.current.delete(file.previewUrl);
        }
        if (file.bucket && file.path) void removePortfolioObject(file.bucket, file.path);
      });
      return [];
    });
  }, []);

  /** Forget the list *without* deleting: the rows now own these objects. */
  const commit = useCallback(() => {
    setFiles((current) => {
      current.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
          previewUrls.current.delete(file.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const uploaded = files.filter(
    (file): file is StagedFile & { publicUrl: string; path: string } =>
      file.status === 'done' && !!file.publicUrl && !!file.path,
  );

  /** The shape `FileUpload` renders. */
  const asUploadedFiles: UploadedFile[] = files.map((file) => ({
    id: file.id,
    name: file.name,
    size: file.size,
    url: file.previewUrl ?? file.publicUrl,
    status: file.status,
    error: file.error,
  }));

  return {
    files: asUploadedFiles,
    uploaded,
    busy: files.some((file) => file.status === 'uploading'),
    hasFiles: files.length > 0,
    select,
    remove,
    discard,
    commit,
  };
}
