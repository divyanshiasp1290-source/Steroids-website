-- Remove deprecated products and categories from the catalogue.
DELETE FROM public.products
WHERE name IN ('Omega-3 Fish Oil 1000mg Softgels', 'Paracetamol 500mg Tablets');

DELETE FROM public.categories
WHERE name IN ('Supplements', 'Pain Relief');