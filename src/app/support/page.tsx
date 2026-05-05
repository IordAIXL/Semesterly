export const metadata = {
  title: "Support | Semesterly",
  description: "Get help with Semesterly.",
};

export default function SupportPage() {
  return (
    <main className="legal-page">
      <section className="legal-card support-card">
        <p className="eyebrow">Semesterly</p>
        <h1>Support</h1>
        <p>Need help with Semesterly? This page is the public support destination for account, planning, privacy, and app questions.</p>

        <h2>Before contacting support</h2>
        <ul>
          <li>Check that you are signed into the correct account.</li>
          <li>Try refreshing the app if courses, assignments, or modules look stale.</li>
          <li>Confirm assignment due dates against your official school/instructor source.</li>
        </ul>

        <h2>Common requests</h2>
        <ul>
          <li><strong>Data export:</strong> use the in-app privacy export flow.</li>
          <li><strong>Account deletion:</strong> use the in-app privacy deletion flow.</li>
          <li><strong>Login trouble:</strong> confirm your email, then request password help when available.</li>
        </ul>

        <h2>Legal</h2>
        <div className="legal-actions">
          <a className="legal-link" href="/privacy">Privacy Policy</a>
          <a className="legal-link" href="/terms">Terms of Use</a>
        </div>
      </section>
    </main>
  );
}
