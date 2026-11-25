DROP TRIGGER IF EXISTS trg_monster_document_matches_library_insert;
DROP TRIGGER IF EXISTS trg_monster_document_matches_library_update;

CREATE TRIGGER trg_monster_document_matches_library_insert
BEFORE INSERT ON monsters
WHEN NOT EXISTS (
    SELECT 1 FROM libraries l
    WHERE l.id = NEW.library_id
      AND l.system_code IN ('add2e', 'shadowlords3e')
      AND l.system_code = json_extract(NEW.document_json, '$.systemCode')
      AND NEW.schema_key = CASE l.system_code
          WHEN 'add2e' THEN 'add2e.monster'
          WHEN 'shadowlords3e' THEN 'shadowlords3e.monster'
      END
      AND NEW.schema_version = 1
      AND NEW.id = json_extract(NEW.document_json, '$.id')
      AND NEW.library_id = json_extract(NEW.document_json, '$.libraryId')
      AND NEW.schema_key = json_extract(NEW.document_json, '$.schemaKey')
      AND NEW.schema_version = json_extract(NEW.document_json, '$.schemaVersion')
      AND NEW.row_version = json_extract(NEW.document_json, '$.rowVersion')
      AND NEW.status = json_extract(NEW.document_json, '$.status')
)
BEGIN
    SELECT RAISE(ABORT, 'MONSTER_SYSTEM_MISMATCH');
END;

CREATE TRIGGER trg_monster_document_matches_library_update
BEFORE UPDATE OF library_id, schema_key, schema_version, status, document_json ON monsters
WHEN NOT EXISTS (
    SELECT 1 FROM libraries l
    WHERE l.id = NEW.library_id
      AND l.system_code IN ('add2e', 'shadowlords3e')
      AND l.system_code = json_extract(NEW.document_json, '$.systemCode')
      AND NEW.schema_key = CASE l.system_code
          WHEN 'add2e' THEN 'add2e.monster'
          WHEN 'shadowlords3e' THEN 'shadowlords3e.monster'
      END
      AND NEW.schema_version = 1
      AND NEW.id = json_extract(NEW.document_json, '$.id')
      AND NEW.library_id = json_extract(NEW.document_json, '$.libraryId')
      AND NEW.schema_key = json_extract(NEW.document_json, '$.schemaKey')
      AND NEW.schema_version = json_extract(NEW.document_json, '$.schemaVersion')
      AND NEW.row_version = json_extract(NEW.document_json, '$.rowVersion')
      AND NEW.status = json_extract(NEW.document_json, '$.status')
)
BEGIN
    SELECT RAISE(ABORT, 'MONSTER_SYSTEM_MISMATCH');
END;
