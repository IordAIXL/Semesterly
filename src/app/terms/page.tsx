export const metadata = {
  title: "Terms of Use | Semesterly",
  description: "Semesterly terms of use for students.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="eyebrow">Semesterly</p>
        <h1>Terms of Use</h1>
        <p className="legal-updated">Last updated: May 5, 2026</p>

        <h2>Use of Semesterly</h2>
        <p>Semesterly is a student planning tool for courses, assignments, projects, exams, schedules, and study priorities. Users are responsible for checking final due dates and requirements from their school, instructors, and official systems.</p>

        <h2>No academic guarantee</h2>
        <p>Semesterly can help organize work, but it does not guarantee grades, academic outcomes, deadline accuracy, or school compliance.</p>

        <h2>Accounts</h2>
        <p>Users are responsible for keeping their account credentials secure and for the accuracy of information they enter into Semesterly.</p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not use Semesterly to upload malicious, illegal, or harmful content.</li>
          <li>Do not attempt to access another user&apos;s account or data.</li>
          <li>Do not interfere with the app&apos;s security, availability, or operation.</li>
        </ul>

        <h2>Data deletion</h2>
        <p>Users may request account data deletion. Deletion may remove courses, assignments, events, preferences, imports, and related records.</p>

        <h2>Changes</h2>
        <p>These terms may be updated as Semesterly evolves. Continued use of the app after updates means the user accepts the updated terms.</p>

        <h2>Contact</h2>
        <p>For support or questions, use the Semesterly support page.</p>
        <a className="legal-link" href="/support">Go to support</a>
      </section>
    </main>
  );
}
