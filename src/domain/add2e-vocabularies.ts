import type { Add2EMonster } from '../generated/add2e-monster';

export const add2eTerrainOptions: [Add2EMonster['profiles'][number]['terrains'][number]['code'], string][] = [
  ['underground','Subterrâneo'],['plains','Planícies'],['forest','Floresta'],['jungle','Selva'],['hills','Colinas'],['mountains','Montanhas'],['swamp','Pântano'],['desert','Deserto'],['coast','Costa'],['freshwater','Água doce'],['ocean','Oceano'],['aquatic','Aquático'],['urban','Urbano'],['ruins','Ruínas'],['wilderness','Ermo'],['aerial','Aéreo'],['space','Espaço'],['extraplanar','Extraplanar'],['any','Qualquer'],['special','Especial'],['other','Outro'],
];

export const add2eActivityOptions: [Add2EMonster['profiles'][number]['activityPeriods'][number]['code'], string][] = [
  ['day','Dia'],['night','Noite'],['twilight','Crepúsculo'],['dawn','Alvorada'],['dusk','Anoitecer'],['any','Qualquer'],['continuous','Contínuo'],['seasonal','Sazonal'],['special','Especial'],['other','Outro'],
];
