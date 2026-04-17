export type Service = {
  slug: string;
  titleNl: string;
  titleEn: string;
  summaryNl: string;
  summaryEn: string;
  pricingNl?: string;
  pricingEn?: string;
};

export const services: Service[] = [
  {
    slug: "ai-agents",
    titleNl: "AI Agents voor E-commerce",
    titleEn: "AI Agents for E-commerce",
    summaryNl:
      "Slimme 24/7 medewerkers voor je webshop: productadvies, support, personalisatie, begeleiding door het bestelproces.",
    summaryEn:
      "24/7 smart staff for your webshop: product advice, support, personalization, checkout guidance.",
    pricingNl: "Starter vanaf \u20ac499/mnd",
    pricingEn: "Starter from \u20ac499/mo",
  },
  {
    slug: "webshops",
    titleNl: "Webshop Ontwikkeling",
    titleEn: "Webshop Development",
    summaryNl:
      "Magento, Shopify, WooCommerce of volledig custom. AI-ready koppelingen en headless-first als dat past.",
    summaryEn:
      "Magento, Shopify, WooCommerce or fully custom. AI-ready integrations, headless-first where it fits.",
    pricingNl: "Op maat",
    pricingEn: "Custom quote",
  },
  {
    slug: "ux-ai",
    titleNl: "UX/UI Optimalisatie met AI",
    titleEn: "UX/UI Optimisation with AI",
    summaryNl:
      "A/B testing met AI, heatmap-analyse, dynamische content, conversie-optimalisatie op basis van gedrag.",
    summaryEn:
      "AI-driven A/B testing, heatmap analysis, dynamic content, behavior-based conversion lifts.",
    pricingNl: "Vanaf \u20ac699/mnd",
    pricingEn: "From \u20ac699/mo",
  },
  {
    slug: "strategy",
    titleNl: "AI Strategie & Workshops",
    titleEn: "AI Strategy & Workshops",
    summaryNl:
      "Halve dag workshop, AI-roadmap op maat, implementatiebegeleiding en training.",
    summaryEn:
      "Half-day workshop, bespoke AI roadmap, implementation support and team training.",
    pricingNl: "\u20ac1.250 eenmalig (workshop)",
    pricingEn: "\u20ac1,250 one-off (workshop)",
  },
  {
    slug: "integrations",
    titleNl: "Integraties & Koppelingen",
    titleEn: "Integrations",
    summaryNl:
      "AI naadloos aan CRM (Salesforce, HubSpot), ERP (SAP, Exact), PIM (Akeneo), marketing automation.",
    summaryEn:
      "AI plugged into CRM (Salesforce, HubSpot), ERP (SAP, Exact), PIM (Akeneo), marketing automation.",
    pricingNl: "Op maat",
    pricingEn: "Custom quote",
  },
  {
    slug: "custom",
    titleNl: "Maatwerk AI Oplossingen",
    titleEn: "Custom AI Solutions",
    summaryNl:
      "Recommendation engines, prijsoptimalisatie, voorspellende modellen, NLP, computer vision.",
    summaryEn:
      "Recommendation engines, price optimisation, predictive models, NLP, computer vision.",
    pricingNl: "Op maat",
    pricingEn: "Custom quote",
  },
];
