import { getSiteData } from "@/lib/site-data";
import ZauraSite from "@/components/site/ZauraSite";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getSiteData();

  // Structured data — only verified business information.
  const phone = data.settings.whatsappPrimary;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "Zaura Zanzibar",
    description:
      "Private, thoughtfully designed serviced apartments in Zanzibar, Tanzania. Request your stay via WhatsApp.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Zanzibar",
      addressCountry: "TZ",
    },
    telephone: phone,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "reservations",
        telephone: phone,
        availableLanguage: ["English", "Swahili"],
      },
    ],
    makesOffer: data.categories.map((c) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Accommodation", name: c.name, description: c.tagline || undefined },
      price: c.pricePerNight > 0 ? c.pricePerNight : undefined,
      priceCurrency: c.currency,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ZauraSite data={data} />
    </>
  );
}
