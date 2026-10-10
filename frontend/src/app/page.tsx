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
