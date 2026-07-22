'use client';

// Browser-side entry point for the public site's interactive islands — e.g.
// uploading vendor-application files to the private `application-intake` bucket
// and invoking the `vendor-application` Edge Function.
//
// The client itself is the shared, stateless anon client (see `./anon`); this
// module exists only to mark those call sites as client-only. Reads that run in
// both runtimes (the vendors search) should import `./anon` directly.
export { createAnonClient as createBrowserClient } from './anon';
