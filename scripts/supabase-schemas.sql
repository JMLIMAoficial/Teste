-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)
-- Creates Prisma multi-schemas before `npx prisma db push`

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS cms;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS engagement;
CREATE SCHEMA IF NOT EXISTS platform;

GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA users TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA profiles TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA media TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA cms TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA analytics TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA engagement TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA platform TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA users TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA profiles TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA media TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cms TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA analytics TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA engagement TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA platform TO postgres, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA users TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA profiles TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA media TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cms TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA engagement TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA platform TO postgres, service_role;
