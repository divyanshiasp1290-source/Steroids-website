import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/legal/PolicyPage";
import shippingBanner from "@/assets/about-facility.jpg";

const title = "Shipping Policy — Helix Pharma UK";
const description = "Dispatch times, insured worldwide delivery, duties and tracking information.";

export const Route = createFileRoute("/shipping-policy")({
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
      eyebrow="Support"
      title="Shipping policy"
      description="How and when your order leaves our Lisbon studio, and what to expect on arrival."
      updated="1 January 2026"
      image={shippingBanner}
      imageAlt="Shipping"
      sections={[
        {
          heading: "Dispatch times",
          body: [
            "In-stock pieces leave the studio within two business days. Made-to-order and commissioned items state their lead time on the product page.",
          ],
        },
        {
          heading: "Rates",
          body: [
            "UK tracked delivery is £4.95 and free on orders above £100. Next-day and Saturday options are offered at checkout, and cold-chain items ship UK mainland only.",
          ],
        },
        {
          heading: "Transit estimates",
          body: [
            "Europe: 2–4 business days. United Kingdom: 3–5. North America: 4–7. Asia-Pacific and rest of world: 5–10.",
            "Every shipment is fully insured and tracked door to door.",
          ],
        },
        {
          heading: "Duties and taxes",
          body: [
            "Orders outside the EU may attract import duty or local sales tax on arrival. These are set by your customs authority and are payable by the recipient.",
          ],
        },
        {
          heading: "Tracking",
          body: [
            "You receive a tracking link as soon as the label is generated, and live status updates appear in your account.",
          ],
        },
      ]}
    />
  ),
});
