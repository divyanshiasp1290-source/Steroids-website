import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/legal/PolicyPage";
import termsBanner from "@/assets/hero.jpg";

const title = "Terms & Conditions — Helix Pharma UK";
const description = "The terms that govern purchases and use of the Helix Pharma UK storefront.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: () => (
    <PolicyPage
      eyebrow="Legal"
      title="Terms & conditions"
      description="The agreement between you and Helix Pharma UK when you shop with us."
      updated="1 January 2026"
      image={termsBanner}
      imageAlt="Terms"
      sections={[
        {
          heading: "Using this site",
          body: [
            "By browsing or ordering from Helix Pharma UK you accept these terms. If you do not accept them, please do not place an order.",
          ],
        },
        {
          heading: "Orders and acceptance",
          body: [
            "An order is an offer to buy. Acceptance happens when we dispatch the goods and send a shipping confirmation.",
            "We may decline or cancel an order where an item is out of stock, a price has been listed in error, or where fraud is suspected. You will be refunded in full.",
          ],
        },
        {
          heading: "Pricing",
          body: [
            "All prices are shown in US dollars and exclude import duties, which are payable by the recipient in some destinations.",
          ],
        },
        {
          heading: "Handmade variation",
          body: [
            "Most pieces are made by hand in small workshops. Slight differences in grain, glaze, weave and tone are inherent to the material and are not defects.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "Nothing in these terms limits liability for death, personal injury or fraud. Otherwise our liability is limited to the value of the order concerned.",
          ],
        },
        {
          heading: "Governing law",
          body: ["These terms are governed by the laws of Portugal."],
        },
      ]}
    />
  ),
});
