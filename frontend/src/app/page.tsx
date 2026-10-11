import Link from "next/link";
import Image from "next/image";
import LandingExperience from "@/components/landing/LandingExperience";
import LandingMotion from "@/components/landing/LandingMotion";
import JourneyNav from "@/components/landing/JourneyNav";
import StoryRender from "@/components/landing/StoryRender";
import styles from "@/components/landing/landing.module.css";

export default function HomePage() {
  return (
      <LandingMotion>
        <LandingExperience />
        <JourneyNav />
        <section className={styles.intro} id="mission" tabIndex={-1} aria-labelledby="mission-heading">
          <div className={styles.missionStory}>
            <div className={styles.missionAnchor}>
              <p className={styles.eyebrow}>What is R3AI?</p>
              <h2 id="mission-heading" className={styles.missionTagline}><span>Recognize.</span><span>Recover.</span><span>Restore.</span></h2>
              <p className={styles.missionSummary}>Robots and people, working together to clean up the places we share.</p>
              <p className={styles.missionHint}>Three simple ideas. Scroll to follow the story ↓</p>
              <a href="#platform" className={styles.missionSkip}>Ready to explore? Choose an app ↗</a>
            </div>
            <div className={styles.missionChapters}>
              <article className={styles.missionChapter}><span className={styles.chapterNumber} aria-hidden="true">01</span><p className={styles.eyebrow}>Recognize / See it</p><h3>Find the litter.</h3><p>A robot looks around with its camera. AI helps it spot things that might be trash, like a bottle left on the ground.</p><RecognitionSamples /><div className={styles.chapterOutcome}>A camera image becomes a possible cleanup target.</div></article>
              <article className={styles.missionChapter}><span className={styles.chapterNumber} aria-hidden="true">02</span><p className={styles.eyebrow}>Recover / Pick it up</p><h3>Let the bot help.</h3><p>The plan is simple: the robot collects the litter it can safely reach and handle. If something is too big or it cannot pick it up, it leaves that item for human help.</p><StoryRender variant="simulation" /><div className={styles.chapterOutcome}>Collect what’s manageable. Flag what needs help.</div></article>
              <article className={styles.missionChapter}><span className={styles.chapterNumber} aria-hidden="true">03</span><p className={styles.eyebrow}>Restore / Finish together</p><h3>People take it<br />from here.</h3><p>Those remaining items are intended to appear in R3AI Go with a location and image. People can review the task and help finish the cleanup, with specialist teams handling anything unsafe.</p><StoryRender variant="mobile" /><div className={styles.chapterOutcome}>One shared mission. A cleaner place for everyone.</div><a href="#platform" className={styles.textButton}>Meet Command and Go <span aria-hidden="true">→</span></a></article>
            </div>
          </div>
          <p className={styles.recognitionNote}>This is the project’s intended workflow. The current website demonstrates a simulated fleet and sample routes.</p>
        </section>
        <ExplorePaths />
        <section className={styles.manifesto} aria-labelledby="manifesto-heading">
          <p className={styles.eyebrow}>The scale changes. The purpose doesn’t.</p>
          <h2 id="manifesto-heading" className={styles.manifestoWords}><span>ONE PLANET.</span><span>EVERY STREET.</span><span>ALL OF US.</span></h2>
          <div className={styles.manifestoBottom}><p>Technology gives us perspective.<br />People give it purpose.</p><Link href="/go" className={styles.textButton}>Find your first step <span aria-hidden="true">↗</span></Link></div>
        </section>
        <section className={styles.questions} id="questions" tabIndex={-1} aria-labelledby="questions-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Before you start</p><h2 id="questions-heading">A few things to know.</h2></div></div>
          <div className={styles.questionList}>
            <details open><summary>Is this a live cleanup service?</summary><p>This is an interactive prototype. Command shows a simulated robot fleet, and Go includes sample cleanup listings. They demonstrate the project’s direction, not verified cleanup operations. Check access and conditions before visiting any location.</p></details>
            <details><summary>Which app should I try first?</summary><p>Start with Command to understand the robot side of R3AI: select a bot and inspect its route and telemetry. Choose Go if you want to explore the community experience: open a route, review its details, and save it.</p></details>
            <details><summary>Do I need to install anything or share my location?</summary><p>Both apps open in your browser. Go can optionally be added to your home screen. You can explore the map without sharing your location; use “Locate me” only if you want to center it on your position.</p></details>
          </div>
        </section>
        <section className={styles.closing}><div className={styles.closingRings} aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div><p className={styles.eyebrow}>Your first step</p><h2>Meet the fleet.<br />Then find your route.</h2><div className={styles.actions}><Link href="/command" className={styles.primaryButton}>Explore the Command demo <span aria-hidden="true">↗</span></Link><Link href="/go" className={styles.textButton}>Explore routes in Go <span aria-hidden="true">→</span></Link></div></section>
        <footer className={styles.footer}><strong>R3AI</strong><span>Planet-sized ambition. Ground-level action.</span><nav aria-label="Footer navigation"><Link href="/command">Command</Link><Link href="/go">Go</Link></nav></footer>
      </LandingMotion>
  );
}

function RecognitionSamples() {
  return <div className={styles.chapterSamples}>
    <p className={styles.eyebrow}>R3-YOLO / Sample recognition outputs</p>
    <div className={styles.recognitionGrid}>
      <figure className={styles.recognitionCard}>
        <div className={styles.recognitionImage}><Image src="/recognition/4obj.webp" alt="A bottle on carpet among packaging and another bottle, with a green detection box labeled bottle 0.85." width={960} height={1280} sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1400px) 44vw, 598px" /></div>
        <figcaption><strong>Bottle / 0.85</strong><p>One bottle detected among other objects.</p></figcaption>
      </figure>
      <figure className={styles.recognitionCard}>
        <div className={styles.recognitionImage}><Image src="/recognition/7obj.webp" alt="A group of bottles, packaging, and a can beside a black bag; one upright bottle is boxed and labeled bottle 0.82." width={960} height={1280} sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1400px) 44vw, 598px" /></div>
        <figcaption><strong>Bottle / 0.82</strong><p>A detection in a busier test scene.</p></figcaption>
      </figure>
    </div>
    <p className={styles.recognitionNote}>Green boxes mark predicted objects. Scores show model confidence, not overall accuracy. These test images do not demonstrate complete detection or a successful pickup.</p>
  </div>;
}

function ExplorePaths() {
  return <section className={styles.platform} id="platform" tabIndex={-1} aria-labelledby="platform-heading">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Choose your starting point</p><h2 id="platform-heading">Want to see the system,<br />or explore a route?</h2></div><p>Both are part of R3AI. Start with Command for the project overview, or head straight to Go for the community experience.</p></div>
    <div className={styles.platformCards}>
      <article className={styles.platformCard}><span className={styles.eyebrow}>Start here / The robot side</span><h3>R3AI Command</h3><p>Explore the simulated fleet on a map and understand how robot-assisted cleanup could be coordinated.</p><ol className={styles.firstSteps}><li>Select a robot on the map or in the fleet list.</li><li>Inspect its status, battery, and telemetry.</li><li>Follow its route to understand the mission.</li></ol><Link href="/command">Explore the Command demo <span aria-hidden="true">↗</span></Link></article>
      <article className={`${styles.platformCard} ${styles.goCard}`}><span className={styles.eyebrow}>Get involved / The people side</span><h3>R3AI Go</h3><p>Try the community cleanup experience with sample routes and a personal activity record.</p><ol className={styles.firstSteps}><li>Browse the map and choose a sample route.</li><li>Review its path and location details.</li><li>Save it to find it again later.</li></ol><Link href="/go">Explore routes in Go <span aria-hidden="true">↗</span></Link></article>
    </div>
    <p className={styles.platformNote}>Opens in your browser. No installation needed. Demo data is for exploration, not live deployment.</p>
  </section>;
}
