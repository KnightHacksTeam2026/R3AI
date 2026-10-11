import styles from "./CommandSplash.module.css";

export default function CommandSplash({ loading = true }: { loading?: boolean }) {
  return (
    <div className={styles.splash} data-loading={loading} aria-hidden={!loading}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.halo} />
          <div className={styles.orbit}><span /></div>
          <div className={styles.orbitOuter}><span /></div>
          <svg className={styles.globe} viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="70" />
            <ellipse cx="100" cy="100" rx="30" ry="70" />
            <ellipse cx="100" cy="100" rx="55" ry="70" />
            <ellipse cx="100" cy="100" rx="70" ry="27" />
            <path d="M30 100h140M100 30v140M42 61h116M42 139h116" />
          </svg>
          <div className={styles.brand}>R3<span>AI</span></div>
          <span className={styles.coordinate}>28.5383° N / 81.3792° W</span>
        </div>
        <p className={styles.eyebrow}>R3AI / COMMAND</p>
        <h2 className={styles.title}>A cleaner world.<br /><span>Coming into view.</span></h2>
        <div className={styles.status} role={loading ? "status" : undefined}>
          <span className={styles.statusDot} aria-hidden="true" />
          Loading your command dashboard
        </div>
        <div className={styles.track} aria-hidden="true"><span /></div>
      </div>
      <div className={styles.footer} aria-hidden="true"><span>GLOBAL OPERATIONS</span><span>SIMULATION WORKSPACE</span></div>
    </div>
  );
}
