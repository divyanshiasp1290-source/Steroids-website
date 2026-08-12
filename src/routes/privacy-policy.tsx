import { createFileRoute } from "@tanstack/react-router";

import { PolicyPage } from "@/components/legal/PolicyPage";
import privacyBanner from "@/assets/account-hero.svg";

const title = "Privacy Policy — Medi Pharma UK";
const description = "How Medi Pharma UK collects, uses, stores and protects your personal data.";

export const Route = createFileRoute("/privacy-policy")({
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
      title="Privacy policy"
      description="What we collect, why we collect it, and the control you keep over it."
      updated="1 January 2026"
      image={privacyBanner}
      imageAlt="Privacy"
      sections={[
        {
          heading: "Information we collect",
          body: [
            "We collect the details you give us when creating an account, placing an order or subscribing to the dispatch: name, email address, delivery address, phone number and order history.",
            "We also collect limited technical data — device type, browser and pages visited — to keep the storefront fast and secure.",
          ],
        },
        {
          heading: "How we use it",
          body: [
            "Your data is used to process orders, arrange insured delivery, answer client care requests and, where you have opted in, send occasional editorial dispatches.",
            "We never sell personal data, and we do not share it with advertisers.",
          ],
        },
        {
          heading: "Payments",
          body: [
            "Card details are handled entirely by our payment processor. Medi Pharma UK never stores full card numbers on its own systems.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "We use essential cookies for sessions and bag contents, plus anonymised analytics. You can clear or block cookies in your browser at any time; essential features may then behave differently.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You may request a copy of your data, ask for corrections, or ask us to delete your account entirely. Write to care@maisoneclat.com and we will action requests within 30 days.",
          ],
        },
      ]}
    />
  ),
});
