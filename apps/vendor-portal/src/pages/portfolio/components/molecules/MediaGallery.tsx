import { ImageList, ImageListItem, ImageListItemBar, IconButton } from '@sinnapi/ui';
import DeleteIcon from '@mui/icons-material/Delete';
import type { MediaModel } from '@/lib/types';

type Props = {
  rows: MediaModel[];
  onRemove: (id: string) => void;
};

/** The vendor's portfolio grid. */
export default function MediaGallery({ rows, onRemove }: Props) {
  return (
    <ImageList variant="masonry" cols={3} gap={12}>
      {rows.map((m) => (
        <ImageListItem key={m.id}>
          <img
            src={m.url ?? '/placeholder-vendor.svg'}
            alt={m.caption ?? 'portfolio item'}
            loading="lazy"
            style={{ borderRadius: 8 }}
          />
          <ImageListItemBar
            title={m.caption ?? m.media_type}
            actionIcon={
              <IconButton
                sx={{ color: 'white' }}
                onClick={() => onRemove(m.id)}
                aria-label="Delete"
              >
                <DeleteIcon />
              </IconButton>
            }
          />
        </ImageListItem>
      ))}
    </ImageList>
  );
}
