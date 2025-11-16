import React, { useEffect } from 'react';

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy — Blockprint';
  }, []);
  const updated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="page">
      <h2>Privacy Policy</h2>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Overview</strong></h3>
        <p>
          This policy explains what information we collect when you use the Service, why we collect it, and how we handle it. The Service showcases Minecraft builds and supports public submissions reviewed by an admin.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Information we collect</strong></h3>
        <ul>
          <li><strong>Uploads:</strong> Files you submit (.glb, .mcstructure, optional .mcpack) and metadata (name, description, categories, credits, socials). We store and serve these to operate the Service.</li>
          <li><strong>Logs:</strong> Standard server logs (e.g., IP address, user agent, timestamps, request paths) for security, abuse prevention, and diagnostics.</li>
          <li><strong>Cookies/Local storage:</strong> We may store theme preference and, for admins only, an authentication token in local storage. Public users do not need an account.</li>
          <li><strong>Basic analytics:</strong> We may use lightweight, privacy‑respecting analytics or aggregated metrics from server logs to understand usage and improve the Service. No third‑party advertising trackers.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>How we use information</strong></h3>
        <ul>
          <li>To operate, maintain, and improve the Service.</li>
          <li>To review and publish submissions, and to serve files to users.</li>
          <li>To protect the Service, prevent abuse, and enforce Terms.</li>
          <li>To comply with legal obligations when applicable.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Sharing</strong></h3>
        <p>
          We do not sell your personal information. We may share information with service providers who help us operate the Service (e.g., hosting). We may disclose information if required by law or to protect rights, property, or safety.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Retention</strong></h3>
        <p>
          We keep submission files and related metadata as long as they are needed to operate the Service or until removed by the admin. Log data may be retained for a limited period for security and operations.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Security</strong></h3>
        <p>
          We take reasonable measures to protect stored files and data; however, no method of transmission or storage is completely secure. Admin access is restricted and protected by authentication.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Your choices</strong></h3>
        <ul>
          <li>You can request removal of a published build if you are the rights holder.</li>
          <li>You can opt out of optional cookies by using your browser settings.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Children</strong></h3>
        <p>
          The Service is not directed to children under 13. If we learn that we hold information from a child under 13, we will take steps to delete it.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Changes</strong></h3>
        <p>
          We may update this policy from time to time. Continued use of the Service after changes means you accept the updated policy.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3><strong>Contact</strong></h3>
        <p>
          For privacy questions or requests, please see the owner information on the About page and reach out to the site owner, <strong>Sugger</strong>.
        </p>
        <div className="muted" style={{ marginTop: 8 }}>Last updated: {updated}</div>
      </section>
    </div>
  );
}
