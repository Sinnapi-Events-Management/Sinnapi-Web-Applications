'use client';
import type { LegalDocument } from '@sinnapi/content';
import { Box, Container } from '../atoms/Layout';
import { Typography } from '../atoms/Typography';

export interface LegalContentProps {
  /** The structured legal document to render (e.g. `generalTerms`). */
  document: LegalDocument;
  /**
   * Suppress the built-in title/subtitle/effective-date header. Use when a page
   * presents the document under its own hero that already owns the title and
   * metadata (e.g. the public site's legal heroes). Defaults to `false` so the
   * component stays self-contained for the portals.
   */
  hideHeader?: boolean;
}

/**
 * Renders a structured `LegalDocument` (from `@sinnapi/content`) as a readable,
 * self-contained legal page. Shared across all apps so Terms render identically
 * whether shown on the public site or inside a portal.
 */
export function LegalContent({ document, hideHeader = false }: LegalContentProps) {
  const { title, subtitle, effectiveDate, jurisdiction, sections } = document;

  return (
    <Container sx={{ py: { xs: 4, md: 6 }, maxWidth: 820 }}>
      {!hideHeader && (
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
              {subtitle}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Effective date: {effectiveDate}
            {jurisdiction ? ` · Jurisdiction: ${jurisdiction}` : ''}
          </Typography>
        </Box>
      )}

      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          counterReset: 'legal-section',
          '& p': { color: 'text.secondary', lineHeight: 1.7, mb: 2 },
        }}
      >
        {sections.map((section) => (
          <Box component="li" key={section.heading} sx={{ mb: { xs: 3, md: 4 } }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                mb: 1.5,
                counterIncrement: 'legal-section',
                '&::before': { content: '"" counter(legal-section) ". "' },
              }}
            >
              {section.heading}
            </Typography>
            {section.body.map((block, blockIndex) => {
              if (block.type === 'paragraph') {
                return (
                  <Typography key={blockIndex} component="p">
                    {block.text}
                  </Typography>
                );
              }

              if (block.type === 'definitions') {
                return (
                  <Box
                    key={blockIndex}
                    component="ul"
                    sx={{
                      pl: 3,
                      mb: 2,
                      '& li': { color: 'text.secondary', lineHeight: 1.7, mb: 1 },
                    }}
                  >
                    {block.items.map((item, itemIndex) => (
                      <Typography key={itemIndex} component="li" variant="body1">
                        <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600 }}>
                          {item.term}
                        </Box>{' '}
                        {item.definition}
                      </Typography>
                    ))}
                  </Box>
                );
              }

              if (block.type === 'table') {
                return (
                  <Box key={blockIndex} sx={{ overflowX: 'auto', mb: 2 }}>
                    <Box
                      component="table"
                      sx={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.9rem',
                        '& th, & td': {
                          border: 1,
                          borderColor: 'divider',
                          p: 1.5,
                          textAlign: 'left',
                          verticalAlign: 'top',
                          lineHeight: 1.6,
                        },
                        '& th': { fontWeight: 600, color: 'text.primary' },
                        '& td': { color: 'text.secondary' },
                      }}
                    >
                      <Box component="thead">
                        <Box component="tr">
                          {block.columns.map((column, columnIndex) => (
                            <Box component="th" key={columnIndex} scope="col">
                              {column}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {block.rows.map((row, rowIndex) => (
                          <Box component="tr" key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <Box component="td" key={cellIndex}>
                                {cell}
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                );
              }

              return (
                <Box
                  key={blockIndex}
                  component="ul"
                  sx={{ pl: 3, mb: 2, '& li': { color: 'text.secondary', lineHeight: 1.7, mb: 1 } }}
                >
                  {block.items.map((item, itemIndex) => (
                    <Typography key={itemIndex} component="li" variant="body1">
                      {item}
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Container>
  );
}
