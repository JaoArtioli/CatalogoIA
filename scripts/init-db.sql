-- Database initialization script for Log Parts Catalog

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for trigram similarity search  
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for text normalization
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Function to normalize codes (remove hyphens, spaces, etc.)
CREATE OR REPLACE FUNCTION normalize_code(input_code TEXT)
RETURNS TEXT AS \$\$
BEGIN
    -- Remove hyphens, spaces, dots and convert to uppercase
    RETURN REGEXP_REPLACE(UPPER(COALESCE(input_code, '')), '[-\\s\\.]', '', 'g');
END;
\$\$ LANGUAGE plpgsql IMMUTABLE;

-- Create some basic configuration data
INSERT INTO brands (id, name, active, created_at) VALUES
(gen_random_uuid(), 'LOG', true, NOW()),
(gen_random_uuid(), 'Bosch', true, NOW()),
(gen_random_uuid(), 'Delphi', true, NOW()),
(gen_random_uuid(), 'NGK', true, NOW()),
(gen_random_uuid(), 'Valeo', true, NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (id, name, active, created_at) VALUES
(gen_random_uuid(), 'Alternadores', true, NOW()),
(gen_random_uuid(), 'Motores de Partida', true, NOW()),
(gen_random_uuid(), 'Bombas d''Ãgua', true, NOW()),
(gen_random_uuid(), 'Filtros', true, NOW()),
(gen_random_uuid(), 'Velas de IgniÃ§Ã£o', true, NOW()),
(gen_random_uuid(), 'Correias', true, NOW()),
(gen_random_uuid(), 'Sensores', true, NOW())
ON CONFLICT (name) DO NOTHING;
