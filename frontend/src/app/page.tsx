import Link from "next/link";
import LandingExperience from "@/components/landing/LandingExperience";
import LandingMotion from "@/components/landing/LandingMotion";
import styles from "@/components/landing/landing.module.css";

export default function HomePage() {
  return (
      <LandingMotion>
        <LandingExperience />
        <nav className={styles.journeyNav} aria-label="Explore this page"><a href="#mission">01 / Understand the project</a><a href="#platform">02 / Choose an app</a><a href="#questions">03 / Before you start</a></nav>
        <section className={styles.intro} id="mission" tabIndex={-1} aria-labelledby="mission-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>What is R3AI?</p><h2 id="mission-heading">A shared view of waste.<br />A path toward cleanup.</h2></div><p>R3 stands for Recognize, Recover, Restore. The idea: use maps to understand a place, robotics to support the response, and people to turn that understanding into local action.</p></div>
          <div className={styles.steps}>
            <article className={styles.step}><span>01 / RECOGNIZE</span><h3>Make waste visible.</h3><p>Explore mapped waste areas and their estimated composition. See where attention can make a difference.</p><small>Geospatial exploration</small></article>
            <article className={styles.step}><span>02 / RECOVER</span><h3>Coordinate the response.</h3><p>See how a simulated ground-bot fleet moves along routes. Inspect a robot’s status and telemetry in Command.</p><small>Ground robot exploration</small></article>
            <article className={styles.step}><span>03 / RESTORE</span><h3>Bring people into the loop.</h3><p>Discover places to begin with R3AI Go and keep a personal record of your cleanup activity.</p><small>Community participation</small></article>
          </div>
        </section>
        <ExplorePaths />
        <section className={styles.signalSection} aria-labelledby="signal-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>From orbit to street level</p><h2 id="signal-heading">Big-picture thinking.<br />Ground-level movement.</h2></div><p>A vision for connected cleanup: recognize a place, coordinate a route, and bring people into the response.</p></div>
          <div className={styles.signalStage}>
            <div className={styles.signalOrbit} aria-hidden="true"><span /><span /><span /><b>R3</b></div>
            <svg className={styles.signalRoute} viewBox="0 0 1000 300" fill="none" aria-hidden="true"><path d="M80 150 C240 150 200 50 370 70 S600 270 710 210 S800 100 920 150" stroke="currentColor" strokeOpacity=".15" strokeWidth="2" /><path data-signal-path d="M80 150 C240 150 200 50 370 70 S600 270 710 210 S800 100 920 150" pathLength="1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            <div className={styles.signalNodes}>
              <article><span>01 / THE SIGNAL</span><h3>A place worth<br />paying attention to.</h3><p>Make mapped waste visible.</p></article>
              <article><span>02 / THE RESPONSE</span><h3>Turn a point<br />into a path.</h3><p>Explore the next cleanup route.</p></article>
              <article><span>03 / THE PEOPLE</span><h3>Make the mission<br />your own.</h3><p>Step outside with R3AI Go.</p></article>
            </div>
          </div>
        </section>
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
