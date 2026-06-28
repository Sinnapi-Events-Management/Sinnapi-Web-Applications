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
 */
export default function AboutContainer() {
  return (
    <>
      <AboutHero />
      <MissionVision />
      <OurStory />
      <ImpactStats />
      <WhyChoose />
      <JoinFamily />
    </>
  );
}
