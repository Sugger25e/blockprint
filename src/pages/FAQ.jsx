import React, { useEffect } from 'react';

export default function FAQ() {
  useEffect(() => {
    const title = 'FAQ — Blockprint';
    const desc = 'Frequently asked questions about Blockprint and Minecraft builds.';
    const url = typeof window !== 'undefined' ? window.location.href : undefined;
    document.title = title;
    setNamedMeta('description', desc);
    setNamedMeta('theme-color', '#3b82f6');
    setOG('og:title', title); setOG('og:description', desc); setOG('og:site_name', 'Blockprint'); setOG('og:type', 'website'); if (url) setOG('og:url', url);
    setTwitter('twitter:card', 'summary'); setTwitter('twitter:title', title); setTwitter('twitter:description', desc);
  }, []);
  function setNamedMeta(name, content) { if (!content) return; let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  function setOG(property, content) { if (!content) return; let el = document.querySelector(`meta[property="${property}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  function setTwitter(name, content) { if (!content) return; let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); } el.setAttribute('content', String(content)); }
  return (
    <div className="page">
      <h2>Frequently Asked Questions</h2>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>What is Blockprint?</h3>
        <p>
          Blockprint is a curated showcase of Minecraft builds with interactive 3D previews (.glb) you can rotate and zoom in your browser.
          Each build has its own detail page, categories, materials list, creator credits, and a downloadable Holoprint pack to help you recreate it in-game.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>How do I upload a build?</h3>
        <p>
          You can upload your Minecraft builds by going to the Upload page. You'll need to provide a .glb file for the 3D preview and optionally a .mcstructure file.
          After uploading, your submission will be reviewed by admins before being published.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>What is Holoprint?</h3>
        <p>
          Holoprint is a Minecraft addon that allows you to recreate builds in-game using hologram projections.
          For more information about Holoprint controls and usage, please refer to the <a href="https://holoprint-mc.github.io/wiki/hologram-controls" target="_blank" rel="noopener noreferrer">Holoprint Wiki</a>.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>How do I download and use a Holoprint pack?</h3>
        <p>
          Once a build is published, you can download the associated Holoprint pack (.mcpack file) from the build's detail page.
          Import the pack into Minecraft to access the hologram tools needed to recreate the build.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>How do I export .mcstructure and .glb files?</h3>
        <p>
          Exporting .mcstructure and .glb files is currently only available in Minecraft Bedrock Edition for Windows using Structure Blocks.
          To export your build:
        </p>
        <ul>
          <li>Place Structure Blocks around your build in Minecraft Bedrock Edition (Windows)</li>
          <li>Save the structure using the Structure Block to get a .mcstructure file</li>
          <li>Use the Structure Block's export option to save as .glb format for the 3D preview</li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>Can I contribute my own builds?</h3>
        <p>
          Yes! Anyone can upload their Minecraft builds. All submissions are reviewed by our admin team to ensure quality and appropriateness.
          Make sure to credit yourself and provide any necessary attribution to original creators if applicable.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 8, padding: '4px 12px' }}>
        <h3>Why isn't my upload showing up?</h3>
        <p>
          All uploads go through an approval process. Your build will appear on the site once it's been reviewed and approved by an admin.
          This helps maintain the quality and curation of the showcase.
        </p>
      </section>
    </div>
  );
}