-- The top plan is sold as Pro (OlympAI Pro, "for the ambitious"). Its id stays
-- 'unlimit', so subscriptions and orders already written keep pointing at it.
update public.plans set name = 'Pro' where id = 'unlimit';
update public.plans set name = 'Plus' where id = 'plus';
