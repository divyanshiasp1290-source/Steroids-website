import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/legal/PolicyPage";
import refundBanner from "@/assets/about-lab.jpg";

const title = "Refund Policy — Medi Pharma UK";
const description = "Returns, exchanges, refund timelines and the Medi Pharma UK two-year guarantee.";

export const Route = createFileRoute("/refund-policy")({
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
      title="Refund policy"
      description="Thirty days to change your mind, and a repair-first guarantee for two years."
      updated="1 January 2026"
      image={refundBanner}
      imageAlt="Refunds"
      sections={[
        {
          heading: "Returns window",
          body: [
            "Return any unused piece in its original packaging within 30 days of delivery for a full refund of the item price.",
          ],
        },
        {
          heading: "How to start a return",
          body: [
            "Write to care@maisoneclat.com with your order number. We issue a prepaid, insured return label for EU and UK orders; other destinations are refunded the standard shipping cost on receipt.",
          ],
        },
        {
          heading: "Refund timing",
          body: [
            "Refunds are issued to the original payment method within five business days of the return arriving at the studio. Banks typically post the credit within a further 3–5 days.",
          ],
        },
        {
          heading: "Exchanges",
          body: [
            "Exchanges are processed as a refund plus a new order so that stock is never held unpaid. We will hold your replacement for 48 hours while the return is in transit.",
          ],
        },
        {
          heading: "Non-returnable items",
          body: [
            "Commissioned and personalised pieces, and items marked final sale, cannot be returned unless faulty.",
          ],
        },
        {
          heading: "Two-year guarantee",
          body: [
            "Every piece carries a two-year guarantee against manufacturing fault. We repair first, replace where repair is not possible, and refund if neither is practical.",
          ],
        },
      ]}
    />
  ),
});
