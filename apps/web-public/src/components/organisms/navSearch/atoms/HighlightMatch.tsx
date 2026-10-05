import { Box } from '@sinnapi/ui/atoms';
import { splitMatch } from '../utils/suggestions';

/**
 * A suggestion's label with the *suggested* part emphasised.
 *
 * The emphasis runs the way round Baymard recommends: the characters the
 * visitor already typed stay at normal weight, and everything the suggestion
 * adds is bold. Bolding the typed portion instead — which is the common
 * mistake — draws the eye to the one part of the row the visitor does not
 * need to read.
 *
 * On a fuzzy row there is no literal match to split on ("photographer" found
 * "Nungi Photography" through trigram similarity), so the whole label renders
 * bold: every character of it is news.
 */
export default function HighlightMatch({ text, term }: { text: string; term: string }) {
  const parts = splitMatch(text, term);
  if (!parts)
    return (
      <Box component="span" sx={{ fontWeight: 600 }}>
        {text}
      </Box>
    );

  const [before, match, after] = parts;
  return (
    <>
      {before && (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {before}
        </Box>
      )}
      <Box component="span" sx={{ fontWeight: 400 }}>
        {match}
      </Box>
      {after && (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {after}
        </Box>
      )}
    </>
  );
}
