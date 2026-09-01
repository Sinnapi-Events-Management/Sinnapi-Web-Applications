import { Box } from '@mui/material';
import { Alert, PageTitle, SectionCard } from '@sinnapi/ui';
import SearchIcon from '@mui/icons-material/ManageSearchOutlined';
import { usePublicIdLookup } from './hooks/usePublicIdLookup';
import LookupSearchForm from './components/molecules/LookupSearchForm';
import LookupResultCard from './components/organisms/LookupResultCard';
import PrefixLegend from './components/organisms/PrefixLegend';

/**
 * Find a record from the ID a caller reads out.
 *
 * The page is deliberately thin — it owns no state and makes no decisions.
 * `usePublicIdLookup` holds the term, the validation and the query;
 * `LookupResultCard` decides how each outcome is worded. What is left here is
 * the arrangement, which is the only thing that has to know about the page.
 *
 * LAYOUT: a single column capped at 720px rather than a full-bleed one. Every
 * element here is a short line — a field, a result, a legend — and a 1600px
 * monitor would otherwise stretch the result rows so far that the label and its
 * value stop reading as a pair.
 */
export default function Lookup() {
  const {
    term,
    isSearchable,
    validationMessage,
    handleChange,
    handleSubmit,
    handleClear,
    result,
    isLoading,
    error,
  } = usePublicIdLookup();

  return (
    <Box sx={{ maxWidth: 720 }}>
      <PageTitle
        title="ID lookup"
        subtitle="Paste a Sinnapi ID a caller has read out and open the record it belongs to."
      />

      <SectionCard title="Look up an ID" icon={<SearchIcon />}>
        <LookupSearchForm
          value={term}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClear={handleClear}
          canSubmit={isSearchable}
          isLoading={isLoading}
          helperText={validationMessage}
        />
      </SectionCard>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error instanceof Error ? error.message : 'Lookup failed.'}
        </Alert>
      )}

      {result && !isLoading && (
        <Box sx={{ mt: 2 }}>
          <LookupResultCard result={result} />
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <PrefixLegend />
      </Box>
    </Box>
  );
}
