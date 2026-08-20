-- Fotos não podem ser perfil e capa ao mesmo tempo.
-- Mantém como foto de perfil e remove a flag de capa nesses casos.
UPDATE "media"."photos"
SET "is_cover" = false
WHERE "is_profile" = true
  AND "is_cover" = true;
