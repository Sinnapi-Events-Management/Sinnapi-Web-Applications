import { Box, Paper, Stack, Typography } from '@sinnapi/ui';
import type { BlocksApi } from '../../hooks/useCampaignBlocks';
import BlockCard from '../molecules/BlockCard';
import AddBlockMenu from '../molecules/AddBlockMenu';
import BlockEditor from '../molecules/blockEditors/BlockEditor';

type Props = { blocks: BlocksApi; disabled?: boolean };

/** The block list: one card per block, plus the palette that adds more. */
export default function CampaignComposer({ blocks, disabled }: Props) {
  return (
    <Stack spacing={2}>
      {blocks.blocks.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed', bgcolor: 'action.hover' }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Nothing in this newsletter yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Start with a hero for the headline, or a text block to write straight into.
          </Typography>
          <AddBlockMenu disabled={disabled} onAdd={blocks.add} />
        </Paper>
      ) : (
        <>
          {blocks.blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={blocks.blocks.length}
              disabled={disabled}
              onMove={(direction) => blocks.move(block.id, direction)}
              onDuplicate={() => blocks.duplicate(block.id)}
              onRemove={() => blocks.remove(block.id)}
            >
              <BlockEditor
                block={block}
                disabled={disabled}
                onChange={(patch) => blocks.update(block.id, patch)}
              />
            </BlockCard>
          ))}
          <Box>
            <AddBlockMenu disabled={disabled} onAdd={blocks.add} />
          </Box>
        </>
      )}
    </Stack>
  );
}
