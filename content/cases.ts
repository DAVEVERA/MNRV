export type Case = {
  slug: string;
  titleNl: string;
  titleEn: string;
  clientNl: string;
  clientEn: string;
  yearsNl: string;
  yearsEn: string;
  summaryNl: string;
  summaryEn: string;
  stack: string[];
  outcomeNl: string;
  outcomeEn: string;
};

export const cases: Case[] = [
  {
    slug: "ai-product-advisor",
    titleNl: "AI Product Adviseur voor fashion-shop",
    titleEn: "AI Product Advisor for fashion shop",
    clientNl: "Mid-market fashion retailer",
    clientEn: "Mid-market fashion retailer",
    yearsNl: "2024",
    yearsEn: "2024",
    summaryNl:
      "Conversational agent die klanten door de collectie loodst, outfits samenstelt en ge\u00efntegreerd is met de Shopify-catalogus.",
    summaryEn:
      "Conversational agent guiding shoppers through the collection, building outfits, wired into Shopify's catalog.",
    stack: ["Shopify", "Anthropic", "Next.js", "Supabase"],
    outcomeNl: "+23% gemiddelde orderwaarde in eerste 90 dagen.",
    outcomeEn: "+23% average order value in the first 90 days.",
  },
  {
    slug: "headless-marketplace",
    titleNl: "Headless marketplace rebuild",
    titleEn: "Headless marketplace rebuild",
    clientNl: "B2B technische groothandel",
    clientEn: "B2B technical wholesaler",
    yearsNl: "2023\u20132024",
    yearsEn: "2023\u20132024",
    summaryNl:
      "Monolithische shop naar headless Next.js + custom PIM-koppeling. AI-zoek die technische specs begrijpt.",
    summaryEn:
      "Monolith shop to headless Next.js + custom PIM integration. AI search that understands technical specs.",
    stack: ["Next.js", "Postgres", "Akeneo", "Elastic"],
    outcomeNl: "LCP van 4.2s naar 1.1s, conversie +18%.",
    outcomeEn: "LCP from 4.2s to 1.1s, conversion +18%.",
  },
  {
    slug: "ops-copilot",
    titleNl: "Ops Copilot voor customer service",
    titleEn: "Ops Copilot for customer service",
    clientNl: "DTC-merk (Benelux)",
    clientEn: "DTC brand (Benelux)",
    yearsNl: "2024",
    yearsEn: "2024",
    summaryNl:
      "AI-agent die service-agents tijdens het gesprek real-time voedt met klanthistorie, voorraadinfo en NBA.",
    summaryEn:
      "AI agent feeding service reps live with customer history, stock info and next-best-action.",
    stack: ["Anthropic", "Supabase Realtime", "HubSpot"],
    outcomeNl: "Average handle time -34%.",
    outcomeEn: "Average handle time -34%.",
  },
];
