
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY "anyone can contact" ON public.contact_messages;
CREATE POLICY "anyone can contact" ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 1 AND 100
  AND length(btrim(email)) BETWEEN 3 AND 255
  AND position('@' in email) > 1
  AND length(btrim(message)) BETWEEN 1 AND 2000
  AND (subject IS NULL OR length(subject) <= 200)
  AND is_read = false
);

DROP POLICY "anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "anyone can subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(email)) BETWEEN 3 AND 255
  AND position('@' in email) > 1
  AND is_active = true
);
