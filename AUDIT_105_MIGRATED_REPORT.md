# Audit Report: 105 Migrated Product Images

**Date**: 2026-09-14T07:29:26.129Z
**Total Audited**: 105
**Permanent Supabase Storage**: 105 / 105 (100%)
**Live HTTP 200 Status**: 105 / 105 (100%)
**Duplicate Images**: 0 (0 Collisions)

## Summary of Findings

1. **Storage Permanence**: Every single product image points to the project's permanent Supabase Storage bucket (`media/products/...`). None reference temporary Google, Bing, or defunct `steroidsupplier.co.uk` URLs.
2. **Uniqueness**: Zero duplicate images or content hashes were assigned across unrelated products.
3. **Availability**: Live network probes confirmed that 100% of images return HTTP 200 OK with valid JPEG, PNG, or WebP content headers.

## Detailed Product Image Inventory (First 30 Sample)

| # | Product Name | Storage URL | Status | Size | Match Confidence |
|---|---|---|---|---|---|
| 1 | **TB-500 2mg Driada Medical** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tb-500-2mg-driada-medical-3-d126f30e.jpg) | 200 OK | 48.8 KB | High |
| 2 | **TADOS Pharmacom** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tados-pharmacom-2-4c1bd9c1.jpg) | 200 OK | 45.0 KB | High |
| 3 | **Trenboac 100 Chang** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/trenboac-100-chang-2-f8d3ba7d.jpg) | 200 OK | 136.8 KB | High |
| 4 | **Testocypol-200 Lyka Labs** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/testocypol-200-lyka-labs-2-3d1673ea.png) | 200 OK | 365.0 KB | High |
| 5 | **Trenbol 100 Genesis** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/trenbol-100-genesis-2-c51aa839.jpg) | 200 OK | 67.2 KB | High |
| 6 | **Tremilad 150mg Driada Medical** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tremilad-150mg-driada-medical-2-26df11b6.jpg) | 200 OK | 144.4 KB | High |
| 7 | **Sustalad 250mg Driada Medical** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/sustalad-250mg-driada-medical-2-e906d5da.jpg) | 200 OK | 133.5 KB | High |
| 8 | **Stanover 50mg Vermodje** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/stanover-50mg-vermodje-2-208d6b3c.jpg) | 200 OK | 200.3 KB | High |
| 9 | **Testenol-250 Lyka Labs** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/testenol-250-lyka-labs-2-b9bcc74d.jpg) | 200 OK | 181.1 KB | High |
| 10 | **Trocknungskurs. Peptide+Cytomel+Clenbuterol** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/trocknungskurs-peptidecytomelclenbuterol-3691b494.jpg) | 200 OK | 151.7 KB | High |
| 11 | **Test-Cypionate 200mg Sterling Knight** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/test-cypionate-200mg-sterling-knight-2-f356e295.jpg) | 200 OK | 48.6 KB | High |
| 12 | **Testosterone Cypionate Injection 250mg Genesis** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/testosterone-cypionate-injection-250mg-genesis-2-911a1904.jpg) | 200 OK | 39.8 KB | High |
| 13 | **Tren Enanthate 200mg Ice Pharmaceuticals** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tren-enanthate-200mg-ice-pharmaceuticals-2-583d000c.jpg) | 200 OK | 73.5 KB | High |
| 14 | **Sp Labs Equipoise 200 mg 10 ml Fläschchen** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/sp-labs-equipoise-200-mg-10-ml-flaschchen-37c1de2a.png) | 200 OK | 93.6 KB | High |
| 15 | **Sustaged 250mg Golden Dragon** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/sustaged-250mg-golden-dragon-2-6185bfc8.jpg) | 200 OK | 78.0 KB | High |
| 16 | **THYMOSIN Α1 10mg Deus Medical** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/thymosin-ce-b11-10mg-deus-medical-a9fcf118.png) | 200 OK | 1499.5 KB | High |
| 17 | **Testosterone Compound Injection 250mg Genesis** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/testosterone-compound-injection-250mg-genesis-2-29de0e42.jpg) | 200 OK | 40.7 KB | High |
| 18 | **TB-500 2mg Deus Medical** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tb-500-2mg-deus-medical-2-aaef0dd3.png) | 200 OK | 92.4 KB | High |
| 19 | **Trenorox Mix 200mg Zerox** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/trenorox-mix-200mg-zerox-2-d9eca04a.jpg) | 200 OK | 53.6 KB | High |
| 20 | **Shallaki Bone & Joint Wellness 125 mg Himalaya** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/shallaki-bone-joint-wellness-125-mg-himalaya-f0f06e36.jpg) | 200 OK | 45.1 KB | High |
| 21 | **Testosterone Compound 250mg Ice Pharmaceuticals** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/testosterone-compound-250mg-ice-pharmaceuticals-2-fa5a1c00.jpg) | 200 OK | 65.9 KB | High |
| 22 | **Spectre Labs MK-2866 OSTARINE 15 mg & LGD-4033 – LIGANDROL 10 mg Spectre Labs** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/spectre-labs-mk-2866-ostarine-15-mg-lgd-4033-ligandrol-10-mg-spectre-labs-a0b19f15.jpg) | 200 OK | 122.5 KB | High |
| 23 | **Tren Acetate 100mg Ice Pharmaceuticals** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tren-acetate-100mg-ice-pharmaceuticals-2-71038a7c.webp) | 200 OK | 20.1 KB | High |
| 24 | **Tri Tren 150 Cenzo Pharma** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/tri-tren-150-cenzo-pharma-2-789cd88b.jpg) | 200 OK | 36.5 KB | High |
| 25 | **Sermorelinacetat Nouveaux Ltd** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/sermorelinacetat-nouveaux-ltd-3-116e660a.webp) | 200 OK | 19.3 KB | High |
| 26 | **Test-prop 100 Genesis** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/test-prop-100-genesis-2-5ddad72d.jpg) | 200 OK | 44.0 KB | High |
| 27 | **Test-Prop 100 Sterling Knight** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/test-prop-100-sterling-knight-2-85f4df56.jpg) | 200 OK | 45.6 KB | High |
| 28 | **T3+T4 (30+120mcg) Pharma Lab** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/t3t4-30120mcg-pharma-lab-b6e6663f.jpg) | 200 OK | 56.8 KB | High |
| 29 | **Testopin-100 BM Pharmaceuticals** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/testopin-100-bm-pharmaceuticals-2-4e8af3e2.png) | 200 OK | 1131.9 KB | High |
| 30 | **Spectre Labs MK2866 OSTARINE 15 mg & S4 ANDARINE 25mg Spectre Labs** | [Storage Link](https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/spectre-labs-mk2866-ostarine-15-mg-s4-andarine-25mg-spectre-labs-bf1e5359.jpg) | 200 OK | 10.5 KB | High |

## Products Requiring Manual Review

None. All 105 products matched packaging criteria.
