
DO $$
DECLARE t text; adm text := '(EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))';
BEGIN
  -- drop admin-manage policies
  FOREACH t IN ARRAY ARRAY['categories','brands','products','product_images','coupons','blog_posts','faqs','banners','pages','settings','media','reviews','contact_messages','newsletter_subscribers','orders','order_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$I FOR ALL TO authenticated USING %2$s WITH CHECK %2$s', t, adm);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['categories','brands','faqs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "auth read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (is_visible OR %2$s)', t, adm);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['products','blogs','pages']
  LOOP NULL; END LOOP;
END $$;

DROP POLICY IF EXISTS "auth read products" ON public.products;
CREATE POLICY "auth read products" ON public.products FOR SELECT TO authenticated
USING (is_published OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "auth read blogs" ON public.blog_posts;
CREATE POLICY "auth read blogs" ON public.blog_posts FOR SELECT TO authenticated
USING (is_published OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "auth read pages" ON public.pages;
CREATE POLICY "auth read pages" ON public.pages FOR SELECT TO authenticated
USING (is_published OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "auth read banners" ON public.banners;
CREATE POLICY "auth read banners" ON public.banners FOR SELECT TO authenticated
USING (is_active OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "auth read reviews" ON public.reviews;
CREATE POLICY "auth read reviews" ON public.reviews FOR SELECT TO authenticated
USING (is_approved OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- profiles
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
DROP POLICY IF EXISTS "own profile write" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- user_roles: own rows only (no recursion), admins read all via separate non-recursive check is unnecessary
DROP POLICY IF EXISTS "roles read" ON public.user_roles;
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- orders
DROP POLICY IF EXISTS "own orders read" ON public.orders;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

DROP POLICY IF EXISTS "own order items read" ON public.order_items;
CREATE POLICY "own order items read" ON public.order_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))));

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
