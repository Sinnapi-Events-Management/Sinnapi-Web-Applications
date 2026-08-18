import { Typography } from '@sinnapi/ui';
import type { CampaignBlock } from '../../../schema';
import HeroBlockEditor from './HeroBlockEditor';
import HeadingBlockEditor from './HeadingBlockEditor';
import RichTextBlockEditor from './RichTextBlockEditor';
import ImageBlockEditor from './ImageBlockEditor';
import ButtonBlockEditor from './ButtonBlockEditor';
import ArticleCardBlockEditor from './ArticleCardBlockEditor';
import ListBlockEditor from './ListBlockEditor';
import QuoteBlockEditor from './QuoteBlockEditor';
import SpacerBlockEditor from './SpacerBlockEditor';

type Props = {
  block: CampaignBlock;
  disabled?: boolean;
  onChange: (patch: Partial<CampaignBlock>) => void;
};

/**
 * Picks the editor for a block's type.
 *
 * The switch is exhaustive over `CampaignBlock`, so adding a block type to the
 * schema without an editor for it is a TypeScript error rather than a blank
 * card an operator discovers at composing time.
 */
export default function BlockEditor({ block, disabled, onChange }: Props) {
  switch (block.type) {
    case 'hero':
      return <HeroBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'heading':
      return <HeadingBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'richText':
      return <RichTextBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'image':
      return <ImageBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'button':
      return <ButtonBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'articleCard':
      return <ArticleCardBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'list':
      return <ListBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'quote':
      return <QuoteBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'spacer':
      return <SpacerBlockEditor block={block} disabled={disabled} onChange={onChange} />;
    case 'divider':
      return (
        <Typography variant="body2" color="text.secondary">
          A hairline rule. Nothing to configure.
        </Typography>
      );
  }
}
