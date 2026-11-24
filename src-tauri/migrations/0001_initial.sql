CREATE TABLE app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE systems (
    code TEXT PRIMARY KEY NOT NULL CHECK (code IN ('add2e', 'shadowlords3e')),
    display_name TEXT NOT NULL,
    schema_key TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);

INSERT INTO systems (code, display_name, schema_key, schema_version, enabled) VALUES
    ('add2e', 'Advanced Dungeons & Dragons 2ª Edição', 'add2e.monster', 1, 1),
    ('shadowlords3e', 'Shadowlords Mini System 3E', 'shadowlords3e.monster', 1, 1);

CREATE TABLE libraries (
    id TEXT PRIMARY KEY NOT NULL,
    system_code TEXT NOT NULL REFERENCES systems(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    sort_name TEXT NOT NULL,
    image_path TEXT,
    image_hash TEXT CHECK (image_hash IS NULL OR (length(image_hash) = 64 AND image_hash NOT GLOB '*[^0-9a-f]*')),
    image_width INTEGER CHECK (image_width IS NULL OR image_width BETWEEN 1 AND 2048),
    image_height INTEGER CHECK (image_height IS NULL OR image_height BETWEEN 1 AND 2048),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    purge_after TEXT,
    row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
    CHECK ((image_path IS NULL AND image_hash IS NULL AND image_width IS NULL AND image_height IS NULL)
        OR (image_path IS NOT NULL AND image_hash IS NOT NULL AND image_width IS NOT NULL AND image_height IS NOT NULL)),
    CHECK ((deleted_at IS NULL AND purge_after IS NULL) OR (deleted_at IS NOT NULL AND purge_after IS NOT NULL))
);

CREATE INDEX idx_libraries_sort_name ON libraries(sort_name, created_at, id);
CREATE INDEX idx_libraries_system_code ON libraries(system_code);
CREATE INDEX idx_libraries_deleted_at ON libraries(deleted_at);
CREATE INDEX idx_libraries_purge_after ON libraries(purge_after);

CREATE TABLE monsters (
    id TEXT PRIMARY KEY NOT NULL,
    library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    sort_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'trashed')),
    previous_status TEXT CHECK (previous_status IS NULL OR previous_status IN ('active', 'archived')),
    schema_key TEXT NOT NULL,
    schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
    document_json TEXT NOT NULL CHECK (json_valid(document_json)),
    image_path TEXT,
    thumbnail_path TEXT,
    image_hash TEXT CHECK (image_hash IS NULL OR (length(image_hash) = 64 AND image_hash NOT GLOB '*[^0-9a-f]*')),
    image_width INTEGER,
    image_height INTEGER,
    content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    deleted_at TEXT,
    purge_after TEXT,
    row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version >= 1),
    CHECK ((status = 'trashed' AND previous_status IS NOT NULL AND deleted_at IS NOT NULL AND purge_after IS NOT NULL)
        OR (status <> 'trashed' AND previous_status IS NULL AND deleted_at IS NULL AND purge_after IS NULL)),
    CHECK ((status = 'archived' AND archived_at IS NOT NULL) OR (status <> 'archived' AND archived_at IS NULL))
);

CREATE INDEX idx_monsters_library_status_name ON monsters(library_id, status, sort_name);
CREATE INDEX idx_monsters_library_updated ON monsters(library_id, updated_at);
CREATE INDEX idx_monsters_purge_after ON monsters(purge_after);

CREATE TRIGGER trg_library_system_immutable_after_monster
BEFORE UPDATE OF system_code ON libraries
WHEN OLD.system_code <> NEW.system_code
 AND EXISTS (SELECT 1 FROM monsters WHERE library_id = OLD.id)
BEGIN
    SELECT RAISE(ABORT, 'LIBRARY_SYSTEM_LOCKED');
END;

CREATE TABLE monster_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    monster_id TEXT NOT NULL REFERENCES monsters(id) ON DELETE CASCADE,
    label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
    kind TEXT NOT NULL,
    is_primary INTEGER NOT NULL CHECK (is_primary IN (0, 1)),
    sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
    frequency_code TEXT NOT NULL,
    frequency_other TEXT,
    organization TEXT NOT NULL,
    diet TEXT NOT NULL,
    quantity_encounter TEXT NOT NULL,
    size_text TEXT NOT NULL,
    morale_text TEXT NOT NULL,
    treasure_text TEXT NOT NULL,
    climate_terrain_notes TEXT,
    activity_notes TEXT,
    special_defenses_summary TEXT,
    magic_protection_summary TEXT,
    stats_json TEXT NOT NULL CHECK (json_valid(stats_json)),
    content_hash TEXT NOT NULL CHECK (length(content_hash) = 64)
);

CREATE UNIQUE INDEX idx_monster_profiles_one_primary
    ON monster_profiles(monster_id) WHERE is_primary = 1;

CREATE TABLE profile_climates (
    profile_id TEXT NOT NULL REFERENCES monster_profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    other_text TEXT,
    PRIMARY KEY (profile_id, code, other_text)
);

CREATE TABLE profile_terrains (
    profile_id TEXT NOT NULL REFERENCES monster_profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    other_text TEXT,
    PRIMARY KEY (profile_id, code, other_text)
);

CREATE TABLE profile_activity_periods (
    profile_id TEXT NOT NULL REFERENCES monster_profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    other_text TEXT,
    PRIMARY KEY (profile_id, code, other_text)
);

CREATE TABLE library_view_preferences (
    library_id TEXT PRIMARY KEY NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    view_mode TEXT NOT NULL DEFAULT 'list' CHECK (view_mode IN ('list', 'grid')),
    sort_direction TEXT NOT NULL DEFAULT 'asc' CHECK (sort_direction IN ('asc', 'desc')),
    updated_at TEXT NOT NULL
);

CREATE TABLE import_journal (
    operation_id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('library', 'monster')),
    state TEXT NOT NULL CHECK (state IN ('staging', 'db_pending', 'files_swapped', 'committed', 'rolled_back')),
    source_path_hash TEXT NOT NULL,
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE file_cleanup_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relative_path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);
