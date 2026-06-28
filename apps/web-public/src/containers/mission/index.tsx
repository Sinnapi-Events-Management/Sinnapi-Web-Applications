import { Typography } from '@sinnapi/ui';
import Prose from '@/components/molecules/prose';

// Mission page: states Sinnapi's mission.
export default function MissionContainer() {
  return (
    <Prose title="Our Mission">
      <Typography component="p">
        To make it easier for everyone to plan their events at their convenience in the least time
        possible, by providing a one-stop home for authentic event service providers across the
        world.
      </Typography>
    </Prose>
  );
}
