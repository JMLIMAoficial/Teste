-- Momentos passam a ser publicados automaticamente; aprova pendentes existentes.
UPDATE media.moments
SET status = 'approved',
    published_at = COALESCE(published_at, created_at)
WHERE status = 'pending';
