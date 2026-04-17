export function OrgJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://mnrv.nl/#org",
        name: "MNRV",
        alternateName: "Meneer Vera",
        url: "https://mnrv.nl/",
        logo: "https://mnrv.nl/mnrv-logo.png",
        foundingDate: "2024",
        email: "info@mnrv.nl",
        address: { "@type": "PostalAddress", addressCountry: "NL" },
        sameAs: [
          "https://www.linkedin.com/in/davevera",
          "https://github.com/DAVEVERA",
        ],
        knowsAbout: [
          "AI agents",
          "E-commerce",
          "Webshop development",
          "UX optimisation",
          "Custom AI",
        ],
      },
      {
        "@type": "Person",
        "@id": "https://mnrv.nl/#dave",
        name: "Dave Vera",
        jobTitle: "Founder, MNRV",
        worksFor: { "@id": "https://mnrv.nl/#org" },
        sameAs: ["https://www.linkedin.com/in/davevera"],
      },
      {
        "@type": "WebSite",
        "@id": "https://mnrv.nl/#site",
        url: "https://mnrv.nl/",
        name: "MNRV",
        inLanguage: ["nl-NL", "en"],
        publisher: { "@id": "https://mnrv.nl/#org" },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
