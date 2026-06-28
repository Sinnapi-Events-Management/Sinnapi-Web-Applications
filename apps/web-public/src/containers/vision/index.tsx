import { Typography } from '@sinnapi/ui';
import Prose from '@/components/molecules/prose';

// Vision page: states Sinnapi's vision.
export default function VisionContainer() {
  return (
    <Prose title="Our Vision">
      <Typography component="p">
        Empowering everyone to plan their events seamlessly, wherever they are.
      </Typography>
    </Prose>
  );
}
