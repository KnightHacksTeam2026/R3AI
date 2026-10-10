import Link from "next/link";
import LandingExperience from "@/components/landing/LandingExperience";
import styles from "@/components/landing/landing.module.css";

export default function HomePage() {
  return (
      <main className={styles.page}>
        <LandingExperience />
        <section className={styles.intro} id="mission">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>The R3AI approach</p><h2>From recognizing a problem<br />to restoring a place.</h2></div><p>Robotics, geospatial technology, and community participation. Three perspectives working toward one cleaner future.</p></div>
          <div className={styles.steps}>
            <article className={styles.step}><span>01 / RECOGNIZE</span><h3>Make waste visible.</h3><p>Explore mapped waste areas and their estimated composition. Our current demo uses clearly labeled synthetic data; YOLO-powered recognition is planned.</p><small>Geospatial exploration</small></article>
            <article className={styles.step}><span>02 / RECOVER</span><h3>Coordinate the response.</h3><p>Select a simulated ground robot, follow its street-based route, and watch mapped waste transition into cleaned areas.</p><small>Ground robot simulation</small></article>
            <article className={styles.step}><span>03 / RESTORE</span><h3>Bring people into the loop.</h3><p>Use R3AI Go to try demo missions and log your own cleanup activity. Records stay on your device in this early implementation.</p><small>Community participation</small></article>
          </div>
        </section>
        <section className={styles.platform} id="platform">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Explore the prototype</p><h2>One mission.<br />Two ways to take part.</h2></div><p>Zoom out to coordinate. Step outside to contribute. Discover the two sides of R3AI.</p></div>
          <div className={styles.platformCards}>
            <article className={styles.platformCard}><span className={styles.eyebrow}>Your global perspective</span><h3>R3AI Command</h3><p>A map-first mission-control experience for exploring synthetic cleanup operations around the world.</p><ul><li>↗ Eight global test regions</li><li>↗ Ground-bot routes and battery simulation</li><li>↗ Mapped and cleaned waste highlights</li></ul><Link href="/command">Open Command <span aria-hidden="true">↗</span></Link></article>
            <article className={`${styles.platformCard} ${styles.goCard}`}><span className={styles.eyebrow}>Your local contribution</span><h3>R3AI Go</h3><p>A mobile-first web app that makes it simple to try a cleanup mission and record your own progress.</p><ul><li>↗ Add to your home screen</li><li>↗ Explore demo cleanup missions</li><li>↗ Keep a local activity history</li></ul><Link href="/go">Discover Go <span aria-hidden="true">↗</span></Link></article>
          </div>
        </section>
        <section className={styles.closing}><p className={styles.eyebrow}>Recognize · Recover · Restore</p><h2>A better future<br />starts with a first step.</h2><Link href="/command" className={styles.primaryButton}>Explore the simulation <span aria-hidden="true">↗</span></Link><p>Built for a hackathon. Robots, satellite telemetry, and waste coverage in Command are simulated—not verified real-world cleanup or live satellite connectivity.</p></section>
        <footer className={styles.footer}><strong>R3AI</strong><span>Planet-sized ambition. Ground-level action.</span><nav aria-label="Footer navigation"><Link href="/command">Command</Link><Link href="/go">Go</Link></nav></footer>
      </main>
  );
}
