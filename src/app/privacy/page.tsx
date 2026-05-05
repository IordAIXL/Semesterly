export const metadata = {
  title: "Privacy Policy | Semesterly",
  description: "Semesterly privacy policy and student data controls.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="eyebrow">Semesterly</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: May 5, 2026</p>
        <p>Semesterly helps students organize courses, assignments, exams, projects, schedules, and study priorities. This policy explains what data the app uses and how students can control it.</p>

        <h2>Data we collect</h2>
        <ul>
          <li>Account details, such as name, email, password hash, role, and session data.</li>
          <li>School planning data, such as courses, assignments, projects, exams, schedule events, locations, colors, categories, and module preferences.</li>
          <li>Imported planning data if a student chooses to import a syllabus or schedule.</li>
          <li>Basic technical data needed to keep the app secure and operating.</li>
        </ul>

        <h2>Data we do not sell</h2>
        <p>Semesterly does not sell student data. Student planning data is used to provide the app experience, save progress, and generate priority views.</p>

        <h2>Passwords and sessions</h2>
        <p>Passwords are stored as secure hashes, not as raw passwords. Semesterly uses session cookies/tokens so users can stay signed in safely.</p>

        <h2>Student controls</h2>
        <ul>
          <li>Users can edit courses, assignments, events, categories, colors, and preferences inside the app.</li>
          <li>Users can request an export of their data through the app privacy export endpoint.</li>
          <li>Users can request deletion of their account data through the app privacy deletion endpoint.</li>
        </ul>

        <h2>Third-party services</h2>
        <p>Semesterly may use hosting, database, analytics, or app-platform services to operate the product. These services are used only as needed to run and secure the app.</p>

        <h2>Contact</h2>
        <p>For privacy or support questions, use the Semesterly support page.</p>
        <a className="legal-link" href="/support">Go to support</a>
      </section>
    </main>
  );
}
