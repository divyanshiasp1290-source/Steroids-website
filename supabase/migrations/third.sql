
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

DROP POLICY "public read categories" ON public.categories;
DROP POLICY "public read brands" ON public.brands;
DROP POLICY "public read products" ON public.products;
DROP POLICY "public read blogs" ON public.blog_posts;
DROP POLICY "public read faqs" ON public.faqs;
DROP POLICY "public read banners" ON public.banners;
DROP POLICY "public read pages" ON public.pages;
DROP POLICY "public read reviews" ON public.reviews;

CREATE POLICY "anon read categories" ON public.categories FOR SELECT TO anon USING (is_visible);
CREATE POLICY "auth read categories" ON public.categories FOR SELECT TO authenticated USING (is_visible OR public.is_admin());
CREATE POLICY "anon read brands" ON public.brands FOR SELECT TO anon USING (is_visible);
CREATE POLICY "auth read brands" ON public.brands FOR SELECT TO authenticated USING (is_visible OR public.is_admin());
CREATE POLICY "anon read products" ON public.products FOR SELECT TO anon USING (is_published);
CREATE POLICY "auth read products" ON public.products FOR SELECT TO authenticated USING (is_published OR public.is_admin());
CREATE POLICY "anon read blogs" ON public.blog_posts FOR SELECT TO anon USING (is_published);
CREATE POLICY "auth read blogs" ON public.blog_posts FOR SELECT TO authenticated USING (is_published OR public.is_admin());
CREATE POLICY "anon read faqs" ON public.faqs FOR SELECT TO anon USING (is_visible);
CREATE POLICY "auth read faqs" ON public.faqs FOR SELECT TO authenticated USING (is_visible OR public.is_admin());
CREATE POLICY "anon read banners" ON public.banners FOR SELECT TO anon USING (is_active);
CREATE POLICY "auth read banners" ON public.banners FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY "anon read pages" ON public.pages FOR SELECT TO anon USING (is_published);
CREATE POLICY "auth read pages" ON public.pages FOR SELECT TO authenticated USING (is_published OR public.is_admin());
CREATE POLICY "anon read reviews" ON public.reviews FOR SELECT TO anon USING (is_approved);
CREATE POLICY "auth read reviews" ON public.reviews FOR SELECT TO authenticated USING (is_approved OR public.is_admin());

REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
