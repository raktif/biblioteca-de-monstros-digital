use std::sync::OnceLock;

use jsonschema::Validator;
use serde_json::Value;
use sha2::Digest;
use unicode_normalization::UnicodeNormalization;

use crate::error::{AppError, AppResult};

static ADD2E_VALIDATOR: OnceLock<Validator> = OnceLock::new();
static SHADOWLORDS_VALIDATOR: OnceLock<Validator> = OnceLock::new();

fn validator() -> &'static Validator {
    ADD2E_VALIDATOR.get_or_init(|| {
        let schema: Value =
            serde_json::from_str(include_str!("../../schemas/add2e/v1/monster.schema.json"))
                .expect("schema AD&D versionado deve ser JSON válido");
        jsonschema::validator_for(&schema).expect("schema AD&D versionado deve ser compilável")
    })
}

fn shadowlords_validator() -> &'static Validator {
    SHADOWLORDS_VALIDATOR.get_or_init(|| {
        let schema: Value = serde_json::from_str(include_str!(
            "../../schemas/shadowlords3e/v1/monster.schema.json"
        ))
        .expect("schema Shadowlords versionado deve ser JSON vÃ¡lido");
        jsonschema::validator_for(&schema).expect("schema Shadowlords deve ser compilÃ¡vel")
    })
}

pub fn validate_monster(document: &Value) -> AppResult<()> {
    match document.get("systemCode").and_then(Value::as_str) {
        Some("add2e") => validate_add2e(document),
        Some("shadowlords3e") => validate_shadowlords(document),
        _ => Err(AppError::new(
            "MONSTER_SYSTEM_INVALID",
            "O sistema da ficha nÃ£o Ã© reconhecido.",
        )),
    }
}

fn validate_shadowlords(document: &Value) -> AppResult<()> {
    let mut issues = shadowlords_validator()
        .iter_errors(document)
        .take(12)
        .map(|error| format!("{}: {error}", error.instance_path()))
        .collect::<Vec<_>>();
    let profiles = document.get("profiles").and_then(Value::as_array);
    if let Some(profiles) = profiles {
        let primary_count = profiles
            .iter()
            .filter(|profile| profile.get("isPrimary").and_then(Value::as_bool) == Some(true))
            .count();
        if primary_count != 1 {
            issues.push("/profiles: deve haver exatamente um perfil principal.".into());
        }
        let mut dragon_ages = Vec::new();
        let mut age_profiles = Vec::new();
        for (index, profile) in profiles.iter().enumerate() {
            let statistics = profile.get("statistics");
            if profile.get("kind").and_then(Value::as_str) == Some("age") {
                age_profiles.push(
                    statistics
                        .and_then(|value| value.get("dragon"))
                        .filter(|value| !value.is_null())
                        .and_then(|dragon| dragon.get("ageCategory"))
                        .and_then(Value::as_str),
                );
            }
            if profile.get("isPrimary").and_then(Value::as_bool) == Some(true)
                && statistics
                    .and_then(|value| value.get("attacks"))
                    .and_then(Value::as_array)
                    .is_none_or(Vec::is_empty)
            {
                issues.push(format!("/profiles/{index}/statistics/attacks: o perfil principal precisa ter ao menos um ataque."));
            }
            if let Some(defense) = statistics.and_then(|value| value.get("defense")) {
                let fields = [
                    "natural",
                    "armorBonus",
                    "shieldBonus",
                    "magicBonus",
                    "otherBonus",
                ];
                if fields
                    .iter()
                    .all(|key| defense.get(key).and_then(Value::as_i64).is_some())
                {
                    let total: i64 = fields
                        .iter()
                        .filter_map(|key| defense.get(key).and_then(Value::as_i64))
                        .sum();
                    if defense.get("final").and_then(Value::as_i64) != Some(total) {
                        issues.push(format!("/profiles/{index}/statistics/defense/final: deve ser igual Ã  soma dos componentes ({total})."));
                    }
                }
            }
            if let Some(dragon) = statistics
                .and_then(|value| value.get("dragon"))
                .filter(|value| !value.is_null())
            {
                dragon_ages.push(
                    dragon
                        .get("ageCategory")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                );
                if profile.get("kind").and_then(Value::as_str) != Some("age") {
                    issues.push(format!("/profiles/{index}/statistics/dragon: apenas perfil etÃ¡rio pode conter dados dracÃ´nicos."));
                }
            }
            if profile
                .pointer("/profileNotes")
                .and_then(Value::as_str)
                .is_some_and(contains_raw_html)
            {
                issues.push(format!(
                    "/profiles/{index}/profileNotes: HTML bruto nao e permitido em Markdown."
                ));
            }
            let statistics = statistics.unwrap_or(&Value::Null);
            if statistics
                .get("specialsSummary")
                .and_then(Value::as_str)
                .is_some_and(contains_raw_html)
            {
                issues.push(format!("/profiles/{index}/statistics/specialsSummary: HTML bruto nao e permitido em Markdown."));
            }
            if let Some(traits) = statistics.get("traits").and_then(Value::as_array) {
                for (trait_index, item) in traits.iter().enumerate() {
                    if item
                        .get("details")
                        .and_then(Value::as_str)
                        .is_some_and(contains_raw_html)
                    {
                        issues.push(format!("/profiles/{index}/statistics/traits/{trait_index}/details: HTML bruto nao e permitido em Markdown."));
                    }
                }
            }
        }
        if document.get("dragonModuleEnabled").and_then(Value::as_bool) == Some(true) {
            let expected = ["hatchling", "young", "adult", "old", "ancient"];
            if age_profiles.len() != expected.len()
                || dragon_ages.len() != expected.len()
                || expected.iter().any(|age| {
                    age_profiles
                        .iter()
                        .filter(|value| **value == Some(*age))
                        .count()
                        != 1
                })
                || expected
                    .iter()
                    .any(|age| dragon_ages.iter().filter(|value| *value == age).count() != 1)
            {
                issues.push(
                    "/profiles: o modulo draconico exige um perfil completo para cada uma das cinco idades."
                        .into(),
                );
            }
        } else if profiles.iter().any(|profile| {
            profile
                .pointer("/statistics/dragon")
                .is_some_and(|value| !value.is_null())
                || profile.get("kind").and_then(Value::as_str) == Some("age")
        }) {
            issues.push(
                "/profiles: perfis etarios e dados de dragao exigem o modulo habilitado.".into(),
            );
        }
    }
    for path in [
        "/narratives/description",
        "/narratives/combat",
        "/narratives/habitatSociety",
        "/narratives/ecology",
        "/narratives/tactics",
        "/narratives/variations",
        "/narratives/additionalNotes",
    ] {
        if document
            .pointer(path)
            .and_then(Value::as_str)
            .is_some_and(contains_raw_html)
        {
            issues.push(format!("{path}: HTML bruto nÃ£o Ã© permitido em Markdown."));
        }
    }
    if issues.is_empty() {
        Ok(())
    } else {
        Err(AppError::new("MONSTER_SCHEMA_INVALID", issues.join("\n")))
    }
}

pub fn validate_add2e(document: &Value) -> AppResult<()> {
    let mut issues = validator()
        .iter_errors(document)
        .take(12)
        .map(|error| format!("{}: {error}", error.instance_path()))
        .collect::<Vec<_>>();

    let profiles = document.get("profiles").and_then(Value::as_array);
    if let Some(profiles) = profiles {
        let primary_count = profiles
            .iter()
            .filter(|profile| profile.get("isPrimary").and_then(Value::as_bool) == Some(true))
            .count();
        if primary_count != 1 {
            issues.push("/profiles: deve haver exatamente um perfil principal.".into());
        }
        for (table_index, table) in document
            .get("auxiliaryTables")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .enumerate()
        {
            let columns = table.get("columns").and_then(Value::as_array).map(Vec::len);
            if let (Some(columns), Some(rows)) =
                (columns, table.get("rows").and_then(Value::as_array))
            {
                for (row_index, row) in rows.iter().enumerate() {
                    if row.as_array().is_some_and(|cells| cells.len() != columns) {
                        issues.push(format!("/auxiliaryTables/{table_index}/rows/{row_index}: a quantidade de células deve corresponder ao número de colunas."));
                    }
                }
            }
        }
    }

    for path in [
        "/narratives/description",
        "/narratives/combat",
        "/narratives/habitatSociety",
        "/narratives/ecology",
        "/narratives/variations",
        "/narratives/additionalNotes",
    ] {
        if document
            .pointer(path)
            .and_then(Value::as_str)
            .is_some_and(contains_raw_html)
        {
            issues.push(format!("{path}: HTML bruto não é permitido em Markdown."));
        }
    }
    if let Some(profiles) = profiles {
        for (index, profile) in profiles.iter().enumerate() {
            if profile
                .get("profileNotes")
                .and_then(Value::as_str)
                .is_some_and(contains_raw_html)
            {
                issues.push(format!(
                    "/profiles/{index}/profileNotes: HTML bruto não é permitido em Markdown."
                ));
            }
            if profile
                .pointer("/statistics/psionics/powers")
                .and_then(Value::as_str)
                .is_some_and(contains_raw_html)
            {
                issues.push(format!(
                    "/profiles/{index}/statistics/psionics/powers: HTML bruto nÃ£o Ã© permitido em Markdown."
                ));
            }
            if issues.len() >= 12 {
                break;
            }
        }
    }

    if issues.is_empty() {
        Ok(())
    } else {
        Err(AppError::new("MONSTER_SCHEMA_INVALID", issues.join("\n")))
    }
}

pub fn canonical_hash(document: &Value) -> AppResult<String> {
    let mut canonical = document.clone();
    normalize_strings(&mut canonical);
    if let Some(object) = canonical.as_object_mut() {
        for key in ["contentHash", "updatedAt", "rowVersion"] {
            object.remove(key);
        }
        if let Some(image) = object.get_mut("image").and_then(Value::as_object_mut) {
            image.remove("path");
        }
    }
    let serialized = serde_json::to_vec(&canonical).map_err(|_| {
        AppError::internal(
            "MONSTER_SERIALIZATION_FAILED",
            "Não foi possível preparar o conteúdo da ficha.",
        )
    })?;
    Ok(format!("{:x}", sha2::Sha256::digest(serialized)))
}

fn normalize_strings(value: &mut Value) {
    match value {
        Value::String(text) => *text = text.nfc().collect(),
        Value::Array(items) => items.iter_mut().for_each(normalize_strings),
        Value::Object(properties) => {
            let existing = std::mem::take(properties);
            for (key, mut value) in existing {
                normalize_strings(&mut value);
                let normalized_key: String = key.nfc().collect();
                properties.insert(normalized_key, value);
            }
        }
        _ => {}
    }
}

fn contains_raw_html(markdown: &str) -> bool {
    let bytes = markdown.as_bytes();
    bytes.iter().enumerate().any(|(index, byte)| {
        if *byte != b'<' || index + 1 >= bytes.len() {
            return false;
        }
        let next = bytes[index + 1];
        if !(next.is_ascii_alphabetic() || matches!(next, b'/' | b'!' | b'?')) {
            return false;
        }
        bytes[index + 2..bytes.len().min(index + 258)]
            .iter()
            .take_while(|character| **character != b'\n' && **character != b'\r')
            .any(|character| *character == b'>')
    })
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::{canonical_hash, validate_add2e, validate_monster};

    #[test]
    fn validates_full_add2e_fixture_against_shared_schema() {
        let fixture: Value =
            serde_json::from_str(include_str!("../../fixtures/add2e/valid-monster.json")).unwrap();
        assert!(validate_add2e(&fixture).is_ok());
    }

    #[test]
    fn canonical_hash_ignores_local_path_row_version_and_update_time() {
        let mut first: Value =
            serde_json::from_str(include_str!("../../fixtures/add2e/valid-monster.json")).unwrap();
        let mut second = first.clone();
        first["rowVersion"] = serde_json::json!(1);
        second["rowVersion"] = serde_json::json!(8);
        second["updatedAt"] = serde_json::json!("2026-11-24T00:00:00Z");
        assert_eq!(
            canonical_hash(&first).unwrap(),
            canonical_hash(&second).unwrap()
        );
    }

    #[test]
    fn rejects_raw_html_in_psionic_markdown() {
        let mut fixture: Value =
            serde_json::from_str(include_str!("../../fixtures/add2e/valid-monster.json")).unwrap();
        fixture["profiles"][0]["statistics"]["psionics"]["powers"] =
            serde_json::json!("<script>alert(1)</script>");
        assert!(
            validate_add2e(&fixture)
                .unwrap_err()
                .message
                .contains("HTML bruto")
        );
    }

    #[test]
    fn validates_shadowlords_fixture_and_cross_field_defense_rule() {
        let mut fixture: Value = serde_json::from_str(include_str!(
            "../../fixtures/shadowlords3e/valid-monster.json"
        ))
        .unwrap();
        assert!(validate_monster(&fixture).is_ok());
        fixture["profiles"][0]["statistics"]["defense"]["final"] = serde_json::json!(12);
        assert!(
            validate_monster(&fixture)
                .unwrap_err()
                .message
                .contains("defense/final")
        );
    }
}
