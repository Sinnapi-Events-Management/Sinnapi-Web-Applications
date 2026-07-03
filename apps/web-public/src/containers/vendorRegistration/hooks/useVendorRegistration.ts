'use client';
import { useMemo, useRef, useState } from 'react';
import type { UploadedFile } from '@sinnapi/ui';
import { createBrowserClient } from '@/lib/supabase/browser';
import {
  INITIAL_VALUES,
  STEP_SCHEMAS,
  type RegistrationValues,
  type Referee,
} from '../data/schema';

const BUCKET = 'application-intake';

export type FileFieldKey =
  | 'profileImage'
  | 'primaryImage'
  | 'gallery'
  | 'videos'
  | 'nationalId'
  | 'proofOfWork';

/** UploadedFile (for the FileUpload molecule) + the storage path we submit. */
export type UploadItem = UploadedFile & { path?: string };

type Files = Record<FileFieldKey, UploadItem[]>;

const EMPTY_FILES: Files = {
  profileImage: [],
  primaryImage: [],
  gallery: [],
  videos: [],
  nationalId: [],
  proofOfWork: [],
};

const IMAGE_RE = /^image\//;
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
const sanitize = (name: string) => name.replace(/[^\w.-]+/g, '-').slice(-80);

export function useVendorRegistration() {
  const supa = useMemo(() => createBrowserClient(), []);
  const submissionRef = useRef<string>(uid());

  const [values, setValues] = useState<RegistrationValues>(INITIAL_VALUES);
  const [files, setFiles] = useState<Files>(EMPTY_FILES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof RegistrationValues>(key: K, value: RegistrationValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: '' } : e));
  }

  // ---- Files ---------------------------------------------------------------
  function patchItem(field: FileFieldKey, id: string, patch: Partial<UploadItem>) {
    setFiles((f) => ({
      ...f,
      [field]: f[field].map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  }

  async function uploadOne(field: FileFieldKey, file: File) {
    const id = uid();
    const item: UploadItem = {
      id,
      name: file.name,
      size: file.size,
      status: 'uploading',
      url: IMAGE_RE.test(file.type) ? URL.createObjectURL(file) : undefined,
    };
    setFiles((f) => ({ ...f, [field]: [...f[field], item] }));

    if (!supa) {
      patchItem(field, id, { status: 'error', error: 'Uploads are unavailable right now' });
      return;
    }
    const path = `${submissionRef.current}/${field}/${id}-${sanitize(file.name)}`;
    const { error } = await supa.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    patchItem(
      field,
      id,
      error ? { status: 'error', error: error.message } : { status: 'done', path },
    );
  }

  function selectFiles(field: FileFieldKey, list: File[], multiple: boolean) {
    const chosen = multiple ? list : list.slice(0, 1);
    if (!multiple) setFiles((f) => ({ ...f, [field]: [] })); // single-slot replaces
    setErrors((e) => (e[field] ? { ...e, [field]: '' } : e));
    chosen.forEach((file) => void uploadOne(field, file));
  }

  function removeFile(field: FileFieldKey, id: string) {
    setFiles((f) => ({ ...f, [field]: f[field].filter((it) => it.id !== id) }));
  }

  const donePath = (field: FileFieldKey) => files[field].find((f) => f.status === 'done')?.path;
  const donePaths = (field: FileFieldKey) =>
    files[field].filter((f) => f.status === 'done' && f.path).map((f) => f.path as string);
  const anyUploading = Object.values(files).some((list) =>
    list.some((f) => f.status === 'uploading'),
  );

  // ---- Validation ----------------------------------------------------------
  function validateStep(index: number): boolean {
    const schema = STEP_SCHEMAS[index];
    const parsed = schema.safeParse(values);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => {
        next[i.path[0] as string] = i.message;
      });
    }
    // File-field requirements live outside zod (they're upload lists).
    if (index === 1 && !donePath('profileImage')) next.profileImage = 'Add a profile image';
    if (index === 2 && !donePath('nationalId')) next.nationalId = 'Upload your National ID';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEP_SCHEMAS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // ---- Referees (dynamic array) -------------------------------------------
  function addReferee() {
    set('referees', [
      ...values.referees,
      { fullName: '', phone: '', email: '', eventWorkedOn: '', eventDate: '' },
    ]);
  }
  function updateReferee(idx: number, patch: Partial<Referee>) {
    set(
      'referees',
      values.referees.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }
  function removeReferee(idx: number) {
    set(
      'referees',
      values.referees.filter((_, i) => i !== idx),
    );
  }

  // ---- Submit --------------------------------------------------------------
  async function submit() {
    const allValid = STEP_SCHEMAS.every((_, i) => validateStep(i));
    if (!allValid) {
      // Jump to the first step that has an error so the user can fix it.
      for (let i = 0; i < STEP_SCHEMAS.length; i += 1) {
        if (!validateStep(i)) {
          setStep(i);
          break;
        }
      }
      return;
    }
    if (anyUploading || !supa) {
      setStatus('error');
      return;
    }

    setStatus('submitting');
    const payload = {
      submissionRef: submissionRef.current,
      businessName: values.businessName,
      applicantType: values.applicantType,
      biography: values.biography,
      businessLocation: values.businessLocation,
      baseCity: values.baseCity,
      yearsInOperation: values.yearsInOperation,
      website: values.website,
      primaryCategoryKey: values.primaryCategoryKey,
      serviceCategoryKeys: values.serviceCategoryKeys,
      pricingModel: values.pricingModel || undefined,
      startingPrice: values.startingPrice || undefined,
      leadTime: values.leadTime || undefined,
      serviceRegionKeys: values.serviceRegionKeys,
      icandyAlumni: values.icandyAlumni === '' ? undefined : values.icandyAlumni === 'yes',
      ownerFullName: values.ownerFullName,
      ownerEmail: values.ownerEmail,
      ownerPhone: values.ownerPhone,
      profileImageUrl: donePath('profileImage'),
      primaryImageUrl: donePath('primaryImage'),
      galleryImageUrls: donePaths('gallery'),
      videoUrls: donePaths('videos'),
      instagramUrl: values.instagramUrl,
      tiktokUrl: values.tiktokUrl,
      linkedinUrl: values.linkedinUrl,
      facebookUrl: values.facebookUrl,
      nationalIdPath: donePath('nationalId'),
      proofOfWorkPath: donePath('proofOfWork'),
      businessRegNumber: values.businessRegNumber,
      taxId: values.taxId,
      bankName: values.bankName,
      accountName: values.accountName,
      accountNumber: values.accountNumber,
      branch: values.branch,
      referees: values.referees.filter((r) => (r.fullName ?? '').trim() !== ''),
      acceptedInfoAccuracy: values.acceptedInfoAccuracy,
      acceptedVendorTerms: values.acceptedVendorTerms,
      acceptedEscrowPolicy: values.acceptedEscrowPolicy,
      acceptedFalseInfoRemoval: values.acceptedFalseInfoRemoval,
    };

    const { error } = await supa.functions.invoke('vendor-application', { body: payload });
    if (error) {
      setStatus('error');
      return;
    }
    setStatus('idle');
    setSubmitted(true);
  }

  return {
    values,
    files,
    errors,
    step,
    stepCount: STEP_SCHEMAS.length,
    submitting: status === 'submitting',
    submitFailed: status === 'error',
    submitted,
    anyUploading,
    set,
    setStep,
    next,
    back,
    selectFiles,
    removeFile,
    addReferee,
    updateReferee,
    removeReferee,
    submit,
  };
}

export type RegistrationApi = ReturnType<typeof useVendorRegistration>;
