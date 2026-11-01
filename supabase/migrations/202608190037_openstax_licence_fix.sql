-- Correcting the OpenStax terms, which were recorded wrongly.
--
-- Migration 202608190031 attached OpenStax readings to every topic of five
-- subjects and wrote `cc-by` with the attribution "OpenStax, CC BY 4.0". That
-- was checked against the wrong thing — the general reputation of OpenStax as
-- an open-textbook publisher rather than the licence each book states. The
-- books' own metadata (openstax.org CMS, license_name/license_version) gives
-- "Creative Commons Attribution-NonCommercial-ShareAlike License" 4.0 for
-- University Physics, Algebra and Trigonometry 2e, Calculus Volume 1 and
-- Biology 2e, and every book page footer says the same.
--
-- Two consequences worth stating where they will be read again:
--
--   Non-commercial. This service may carry the material while it is free. The
--   day it charges, these rows have to come out.
--
--   Share-alike. Anything adapted from an OpenStax problem — a rewritten
--   statement, a reference solution written against it, a numeric variant —
--   is a derivative and has to be published under the same licence. That is a
--   decision about the product's own content, not a footnote about a link.
--
-- Nothing here is deleted. A wrong licence on a correct link is fixed by
-- correcting the licence.

update public.resources
set licence = 'cc-by-nc-sa'::public.content_licence,
    attribution = 'OpenStax, CC BY-NC-SA 4.0'
where url ilike '%openstax.org%'
  and licence = 'cc-by'::public.content_licence;
