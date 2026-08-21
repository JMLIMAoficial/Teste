-- Merge profile + cover into a single main photo per profile.
-- Prefer existing is_profile; else is_cover; else first by sort_order.

WITH ranked AS (
  SELECT
    id,
    profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY profile_id
      ORDER BY
        CASE WHEN is_profile THEN 0 WHEN is_cover THEN 1 ELSE 2 END,
        sort_order ASC,
        created_at ASC
    ) AS rn
  FROM media.photos
)
UPDATE media.photos p
SET
  is_profile = (r.rn = 1),
  is_cover = (r.rn = 1)
FROM ranked r
WHERE p.id = r.id;
