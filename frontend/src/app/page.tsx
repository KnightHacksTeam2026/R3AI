import Link from "next/link";
import LandingExperience from "@/components/landing/LandingExperience";
import LandingMotion from "@/components/landing/LandingMotion";
import styles from "@/components/landing/landing.module.css";

export default function HomePage() {
  return (
      <LandingMotion>
        <LandingExperience />
        <section className={styles.intro} id="mission">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>The R3AI approach</p><h2>From recognizing a problem<br />to restoring a place.</h2></div><p>Robotics, geospatial technology, and community participation. Three perspectives working toward one cleaner future.</p></div>
          <div className={styles.steps}>
            <article className={styles.step}><span>01 / RECOGNIZE</span><h3>Make waste visible.</h3><p>Explore mapped waste areas and their estimated composition. See where attention can make a difference.</p><small>Geospatial exploration</small></article>
            <article className={styles.step}><span>02 / RECOVER</span><h3>Coordinate the response.</h3><p>Explore ground-bot routes, inspect cleanup coverage, and bring the next steps into focus.</p><small>Ground robot exploration</small></article>
            <article className={styles.step}><span>03 / RESTORE</span><h3>Bring people into the loop.</h3><p>Discover places to begin with R3AI Go and keep a personal record of your cleanup activity.</p><small>Community participation</small></article>
          </div>
        </section>
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
        <section className={styles.platform} id="platform">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Find your perspective</p><h2>One mission.<br />Two ways to take part.</h2></div><p>Zoom out to coordinate. Step outside to contribute. Discover the two sides of R3AI.</p></div>
          <div className={styles.platformCards}>
            <article className={styles.platformCard}><span className={styles.eyebrow}>Your global perspective</span><h3>R3AI Command</h3><p>A map-first workspace for exploring cleanup routes and understanding the bigger picture.</p><ul><li>↗ Explore eight regions around the world</li><li>↗ Inspect ground-bot routes and mission progress</li><li>↗ Discover mapped cleanup areas</li></ul><Link href="/command">Open Command <span aria-hidden="true">↗</span></Link></article>
            <article className={`${styles.platformCard} ${styles.goCard}`}><span className={styles.eyebrow}>Your local contribution</span><h3>R3AI Go</h3><p>A mobile-first web app that makes it simple to explore cleanup routes and record your own progress.</p><ul><li>↗ Add to your home screen</li><li>↗ Explore and save cleanup routes</li><li>↗ Keep a personal activity history</li></ul><Link href="/go">Discover Go <span aria-hidden="true">↗</span></Link></article>
          </div>
        </section>
        <section className={styles.closing}><div className={styles.closingRings} aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div><p className={styles.eyebrow}>Recognize · Recover · Restore</p><h2>A better future<br />starts with a first step.</h2><Link href="/command" className={styles.primaryButton}>Explore R3AI Command <span aria-hidden="true">↗</span></Link></section>
        <footer className={styles.footer}><strong>R3AI</strong><span>Planet-sized ambition. Ground-level action.</span><nav aria-label="Footer navigation"><Link href="/command">Command</Link><Link href="/go">Go</Link></nav></footer>
      </LandingMotion>
  );
}
