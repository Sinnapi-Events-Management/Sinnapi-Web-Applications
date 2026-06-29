import { Box } from '@sinnapi/ui';
import { scrollAnchor } from '@/lib/sx';
import AboutHero from './organisms/aboutHero';
import MissionVision from './organisms/missionVision';
import OurStory from './organisms/ourStory';
import ImpactStats from './organisms/impactStats';
import WhyChoose from './organisms/whyChoose';
import JoinFamily from './organisms/joinFamily';

/**
 * About page container. Composes the about organisms in a narrative funnel:
 * who we are → what drives us → why we exist → proof of impact → why choose us →
 * join the family. Presentation lives in the organisms; this file only sequences.
 *
 * Footer "Mission", "Vision" and "Our Story" links deep-link into this page via
 * hash anchors. The Mission/Vision anchors (`#mission`, `#vision`) live on the
 * individual pillar cards inside MissionVision; the `#story` anchor is wired here
 * around OurStory. `scrollAnchor` offsets each target below the sticky navbar.
 */
export default function AboutContainer() {
  return (
    <>
      <AboutHero />
      <MissionVision />
      <Box id="story" sx={scrollAnchor}>
        <OurStory />
      </Box>
      <ImpactStats />
      <WhyChoose />
      <JoinFamily />
    </>
  );
}
