import type { MonsterSystemCode } from '../domain/monster-systems';

export type PortableStatus = 'active' | 'archived';
export type PortablePackageKind = 'library' | 'monster';
export type PortableImageRef = { path: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; width: number; height: number };
export type PortableSource = { title: string; entry: string | null; page: string | null; notes: string | null };
export type PortableLibrary = { format: 'biblioteca-de-monstros-digital.library'; formatVersion: 1; kind: 'library'; systemCode: MonsterSystemCode; schemaKey: `${MonsterSystemCode}.monster`; schemaVersion: number; library: { name: string; image: PortableImageRef | null } };
export type PortableMonster = Record<string, unknown> & { name: string; status: PortableStatus; image: PortableImageRef | null; profiles: PortableProfile[]; sources: PortableSource[] };
export type PortableProfile = Record<string, unknown> & { label: string; kind: string; isPrimary: boolean; climates: PortableCodeOther[]; terrains: PortableCodeOther[]; activityPeriods: PortableCodeOther[]; statistics: Record<string, unknown> };
export type PortableCodeOther = { code: string; other: string | null };
export type PortableMonsterEnvelope<T extends PortableMonster = PortableMonster> = { format: `biblioteca-de-monstros-digital.${MonsterSystemCode}.monster`; formatVersion: 1; kind: 'monster'; systemCode: MonsterSystemCode; schemaKey: `${MonsterSystemCode}.monster`; schemaVersion: number; monster: T };
export type PortableManifest = { format: 'biblioteca-de-monstros-digital.package'; formatVersion: 1; kind: 'package-manifest'; packageKind: PortablePackageKind; systemCode: MonsterSystemCode; schemaKey: `${MonsterSystemCode}.monster`; schemaVersion: number; exportedAt: string; generator: { name: 'Biblioteca de Monstros Digital'; version: string }; counts: { libraries: number; monsters: number; activeMonsters: number; archivedMonsters: number; images: number; files: number }; totalUncompressedBytes: number; files: Array<{ path: string; role: 'library-data' | 'monster-data' | 'library-image' | 'monster-image'; mediaType: string; size: number; sha256: string }> };
