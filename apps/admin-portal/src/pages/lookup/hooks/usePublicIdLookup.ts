import { useCallback, useMemo, useState } from 'react';
import { isLegacyReference, isPublicId, normalizePublicId } from '@sinnapi/utils/publicId';
import { usePublicIdLookup as usePublicIdLookupQuery } from '@/hooks/queries';

/**
 * All of the lookup page's behaviour, so the components below it are structure
 * only.
 *
 * THE TERM IS NOT THE QUERY, AND THAT IS THE POINT
 * `term` is what the agent is typing; `submitted` is what has actually been
 * asked. Keeping them apart is what makes this a lookup rather than a
 * search-as-you-type: an identifier is meaningless until its tenth character, so
 * firing on each keystroke would spend nine round trips proving nothing and
 * would flash nine "not found" states at someone who has not finished typing.
 * The agent presses Enter, or the field auto-submits the moment what they have
 * typed becomes a valid identifier — see `handleChange`.
 *
 * NORMALISATION HAPPENS ON THE WAY IN, NOT ON THE WAY OUT
 * `normalizePublicId` uppercases and resolves the confusable letters, so an
 * agent transcribing "ess-vee-two-eight-five-kay-seven-bee-vee-oh" from a phone
 * call gets `SV285K7BV0`'s `O` turned into a `0` before it is either validated
 * or sent. Doing it here rather than in the field means the value the user sees
 * is the value that was searched — a field that displays one string and queries
 * another is how "but I typed it correctly" tickets start.
 */
export function usePublicIdLookup() {
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');

  const normalized = useMemo(() => normalizePublicId(term), [term]);

  /**
   * Legacy references are admitted alongside current identifiers because the
   * RPC matches both, and a client reading off a pre-migration PDF is exactly
   * the caller this page exists for. They fail `isPublicId` by design — the
   * hyphen and the one-letter prefix are what make them legacy — so the two
   * checks are unioned rather than one being loosened.
   */
  const isSearchable = isPublicId(normalized) || isLegacyReference(normalized);

  const query = usePublicIdLookupQuery(submitted, submitted.length > 0);

  const handleChange = useCallback((next: string) => {
    setTerm(next);
    // Auto-submit on completion: an identifier has a known length, so the
    // moment one is well-formed there is nothing left for the agent to add and
    // asking them to press Enter as well is a keystroke charged for nothing.
    // Legacy references are variable-length and have no such moment, so they
    // wait for an explicit submit.
    const candidate = normalizePublicId(next);
    if (isPublicId(candidate)) setSubmitted(candidate);
  }, []);

  const handleSubmit = useCallback(() => {
    if (isSearchable) setSubmitted(normalized);
  }, [isSearchable, normalized]);

  const handleClear = useCallback(() => {
    setTerm('');
    setSubmitted('');
  }, []);

  /**
   * The one-line reason the field is unhappy, or null while it is fine.
   *
   * Silent below four characters: an agent three characters into a ten-character
   * id is not making a mistake, and telling them so is noise. The message only
   * appears once they have typed enough that a typo is the likelier explanation.
   */
  const validationMessage = useMemo(() => {
    if (normalized.length === 0 || normalized.length < 4) return null;
    if (isSearchable) return null;
    return 'That is not a Sinnapi ID. They look like SV285K7BV9 — two letters, then eight characters.';
  }, [normalized, isSearchable]);

  return {
    term,
    normalized,
    submitted,
    isSearchable,
    validationMessage,
    handleChange,
    handleSubmit,
    handleClear,
    result: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error,
  };
}
