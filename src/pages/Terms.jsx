import React, { useEffect } from 'react';

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms — Blockfolio';
  }, []);
  const updated = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="page">
      <h2>Terms of Service</h2>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>1) Acceptance of Terms</strong></div>
        <p>
          By accessing or using this website (the “Service”), you agree to these Terms. If you do not agree, do not use the Service. We may update these Terms at any time; continued use constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>2) The Service</strong></div>
        <p>
          The Service showcases Minecraft builds with interactive 3D previews and, when available, downloadable Holoprint packs. Public users may submit builds for review. Only approved and published builds appear on the Discover page.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>3) Submissions and License</strong></div>
        <ul>
          <li>You represent that you have the necessary rights to upload your files and that your submission does not infringe any third‑party rights.</li>
          <li>You retain ownership of your submissions. By submitting, you grant the Service and its operator a worldwide, non‑exclusive, royalty‑free license to host, display, reproduce, and distribute your submission files (.glb, .mcstructure, .mcpack) for the purpose of operating and promoting the Service.</li>
          <li>Submissions may be declined, edited (e.g., metadata), or removed at the operator’s discretion.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>4) Acceptable Use</strong></div>
        <ul>
          <li>Do not upload unlawful, infringing, hateful, or malicious content.</li>
          <li>No reverse engineering, scraping, or abusing the Service or its infrastructure.</li>
          <li>Admin functionality is restricted; do not attempt to gain unauthorized access.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>5) Intellectual Property</strong></div>
        <ul>
          <li>Site content, branding, and code are owned by the operator or its licensors and are protected by applicable IP laws.</li>
          <li>Submissions remain the property of their creators, subject to the license granted above.</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>6) Takedowns</strong></div>
        <p>
          If you believe content infringes your rights, please reach out with sufficient detail to identify the work, the allegedly infringing content, and your contact information. We will review and, where appropriate, remove or restrict access.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>7) Disclaimers</strong></div>
        <p>
          The Service is provided “as is” and “as available.” We make no warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, or non‑infringement. We do not guarantee continuous availability or error‑free operation.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>8) Limitation of Liability</strong></div>
        <p>
          To the maximum extent permitted by law, the operator will not be liable for any indirect, incidental, special, consequential, or exemplary damages arising from your use of the Service or any content accessed through it.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>9) Changes and Termination</strong></div>
        <p>
          We may modify or discontinue the Service, or remove content, at any time. We may suspend or terminate access for violations of these Terms or to protect the Service and its users.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <div className="panel-head"><strong>10) Contact</strong></div>
        <p>
          For questions or requests (including takedowns), please see the owner information on the About page and reach out to the site owner, <strong>Sugger</strong>.
        </p>
        <div className="muted" style={{ marginTop: 8 }}>Last updated: {updated}</div>
      </section>
    </div>
  );
}
