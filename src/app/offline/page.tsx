export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section className="card offline-card">
        <div className="brand"><span className="brand-mark">S</span> Semesterly</div>
        <p className="eyebrow">Offline mode</p>
        <h1>You’re offline.</h1>
        <p className="subtitle">Semesterly keeps the installed app shell available. Reconnect to sync tasks, courses, calendar changes, and privacy actions.</p>
        <a className="offline-link" href="/">Try again</a>
      </section>
    </main>
  );
}
