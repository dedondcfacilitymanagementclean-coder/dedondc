-- 007: attach the supplied pictures (bundled in public/services) to each service. Run after 006.
-- Safe to re-run. Pictures uploaded later from the admin dashboard replace these.
update public.services set image_path = '/services/residential-cleaning.webp' where slug = 'residential-cleaning';
update public.services set image_path = '/services/commercial-cleaning.webp' where slug = 'commercial-cleaning';
update public.services set image_path = '/services/janitorial-services.webp' where slug = 'janitorial-services';
update public.services set image_path = '/services/deep-cleaning.webp' where slug = 'deep-cleaning';
update public.services set image_path = '/services/post-construction-cleaning.webp' where slug = 'post-construction-cleaning';
update public.services set image_path = '/services/kitchen-cleaning-sanitation.webp' where slug = 'kitchen-cleaning-sanitation';
update public.services set image_path = '/services/carpet-upholstery-care.webp' where slug = 'carpet-upholstery-care';
update public.services set image_path = '/services/medical-facility-sanitation.webp' where slug = 'medical-facility-sanitation';
update public.services set image_path = '/services/facility-maintenance.webp' where slug = 'facility-maintenance';
update public.services set image_path = '/services/fumigation-services.webp' where slug = 'fumigation-services';
update public.services set image_path = '/services/pest-control.webp' where slug = 'pest-control';
update public.services set image_path = '/services/hotel-serviced-apartment-cleaning.webp' where slug = 'hotel-serviced-apartment-cleaning';
update public.services set image_path = '/services/glass-windows-tiles-cleaning.webp' where slug = 'glass-windows-tiles-cleaning';
