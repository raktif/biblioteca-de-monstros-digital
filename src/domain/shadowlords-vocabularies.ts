export const climateOptions = [
  ['arid', 'Árido'], ['arctic', 'Ártico'], ['cold', 'Frio'], ['hot', 'Quente'],
  ['subarctic', 'Subártico'], ['subtropical', 'Subtropical'], ['temperate', 'Temperado'],
  ['tropical', 'Tropical'], ['any', 'Qualquer'], ['any_except_arctic', 'Qualquer exceto ártico'],
  ['non_tropical', 'Não tropical'], ['variable', 'Variável'],
] as const;

export const terrainOptions = [
  ['abyss', 'Abismo'], ['freshwater', 'Águas doces'], ['deep_water', 'Águas profundas'],
  ['shallow_water', 'Águas rasas'], ['saltwater', 'Águas salgadas'], ['inhabited_areas', 'Áreas habitadas'],
  ['rural_areas', 'Áreas rurais'], ['sandbanks', 'Bancos de areia'], ['groves', 'Bosques'],
  ['caves', 'Cavernas'], ['cemeteries', 'Cemitérios'], ['marshes', 'Charcos'], ['cities', 'Cidades'],
  ['hills', 'Colinas'], ['coasts', 'Costas marítimas'], ['deserts', 'Desertos'], ['space', 'Espaço'],
  ['forests', 'Florestas'], ['islands', 'Ilhas'], ['lakes', 'Lagos'], ['labyrinths', 'Labirintos'],
  ['seas', 'Mares'], ['dungeons', 'Masmorras'], ['mountains', 'Montanhas'], ['clouds', 'Nuvens'],
  ['oceans', 'Oceanos'], ['swamps', 'Pântanos'], ['plateaus', 'Planaltos'], ['plains', 'Planícies'],
  ['reefs', 'Recifes'], ['wilderness', 'Regiões selvagens'], ['rivers', 'Rios'], ['ruins', 'Ruínas'],
  ['jungles', 'Selvas'], ['underground', 'Subterrâneos'], ['polar_lands', 'Terras polares'],
  ['tundras', 'Tundras'], ['tombs', 'Túmulos'], ['valleys', 'Vales'], ['volcanoes', 'Vulcões'],
  ['elysium', 'Elísio'], ['wildspace', 'Espaço Selvagem'], ['limbo', 'Limbo'], ['nine_hells', 'Nove Infernos'],
  ['astral_plane', 'Plano Astral'], ['shadow_plane', 'Plano das Sombras'], ['ethereal_plane', 'Plano Etéreo'],
  ['prime_material_plane', 'Plano Material Primário'], ['any', 'Qualquer'], ['any_aquatic', 'Qualquer aquático'],
  ['any_terrestrial', 'Qualquer terrestre'], ['any_underground', 'Qualquer subterrâneo'],
  ['special', 'Especial'], ['variable', 'Variável'],
] as const;

export const frequencyOptions = [
  ['common', 'Comum'], ['uncommon', 'Incomum'], ['very_rare', 'Muito raro'], ['rare', 'Raro'],
] as const;

export const activityOptions = [
  ['day', 'Diurno'], ['night', 'Noturno'], ['twilight', 'Crepuscular'], ['dawn', 'Amanhecer'],
  ['dusk', 'Anoitecer'], ['any', 'Qualquer'], ['continuous', 'Contínuo'], ['seasonal', 'Sazonal'],
  ['special', 'Especial'], ['other', 'Outro'],
] as const;

export const organizationOptions = [
  ['cluster', 'Aglomerado'], ['angre', 'Angre'], ['arrangement', 'Arranjo'], ['band', 'Bando'],
  ['grove', 'Bosque'], ['bunch', 'Cacho'], ['caliphate', 'Califado'], ['school', 'Cardume'],
  ['clan', 'Clã'], ['hive', 'Colmeia'], ['colony', 'Colônia'], ['company', 'Companhia'],
  ['community', 'Comunidade'], ['dictatorship', 'Ditadura'], ['emirate', 'Emirado'], ['swarm', 'Enxame'],
  ['squad', 'Esquadrão'], ['family', 'Família'], ['genos', 'Genos'], ['group', 'Grupo'],
  ['hunting_party', 'Grupo de caça'], ['khanate', 'Khanato'], ['bed', 'Leito'], ['herd', 'Manada'],
  ['patch', 'Mancha'], ['pack', 'Matilha'], ['monarchy', 'Monarquia'], ['ship_military', 'Navio/militar'],
  ['nest', 'Ninho'], ['padixado', 'Padixado'], ['pair', 'Par'], ['platoon', 'Pelotão'],
  ['flock', 'Rebanho'], ['flight', 'Revoada'], ['solitary', 'Solitário'], ['sultanate', 'Sultanato'],
  ['tribe', 'Tribo'], ['none_multicellular', 'Nenhuma Pluricelular'], ['nation', 'Nação'],
] as const;

export const dietOptions = [
  ['water', 'Água'], ['air', 'Ar'], ['assimilation', 'Assimilação'], ['corpses', 'Cadáveres'],
  ['heat', 'Calor'], ['meat', 'Carne'], ['rotten_meat', 'Carne podre'], ['carnivore', 'Carnívoro'],
  ['brains', 'Cérebros'], ['fuel', 'Combustível'], ['dweomer', 'Dweomer'], ['emotions', 'Emoções'],
  ['mental_energy', 'Energia mental'], ['psionic_energy', 'Energia psiônica'], ['fire', 'Fogo'],
  ['photosynthesis', 'Fotossíntese'], ['herbivore', 'Herbívoro'], ['insectivore', 'Insetívoro'],
  ['books', 'Livros'], ['magic', 'Magia'], ['metals', 'Metais'], ['minerals', 'Minerais'],
  ['scavenger', 'Necrófago'], ['omnivore', 'Onívoro'], ['fish', 'Peixes'], ['living_plasma', 'Plasma vivo'],
  ['plankton', 'Plâncton'], ['blood', 'Sangue'], ['living_beings', 'Seres vivos'], ['soil', 'Solo'],
  ['earth', 'Terra'], ['moisture', 'Umidade'], ['vegetarian', 'Vegetariano'], ['wind', 'Vento'],
  ['special', 'Especial'], ['none', 'Nenhuma'], ['none_known', 'Nenhuma conhecida'],
  ['not_applicable', 'Não se aplica'], ['null', 'Nula'], ['any', 'Qualquer'], ['variable', 'Variável'],
] as const;

export const sizeOptions = [
  ['abyssal', 'Abissal'], ['diminutive', 'Diminuto'], ['huge', 'Enorme'], ['large', 'Grande'],
  ['immense', 'Imenso'], ['medium', 'Médio'], ['small', 'Pequeno'],
] as const;

export const moraleOptions = [0, 1, 2, 3] as const;

export const damageTypeOptions = [
  ['slashing', 'Cortante'], ['piercing', 'Perfurante'], ['bludgeoning', 'Contundente'], ['fire', 'Fogo'],
  ['cold', 'Frio'], ['electricity', 'Eletricidade'], ['acid', 'Ácido'], ['poison', 'Veneno'],
  ['magic', 'Mágico'], ['physical', 'Físico'], ['all', 'Todos'], ['other', 'Outro'],
] as const;

export const traitCategoryOptions = [
  ['special', 'Especial'], ['sense', 'Sentido'], ['immunity', 'Imunidade'], ['resistance', 'Resistência'],
  ['weakness', 'Fraqueza/contrajogo'], ['innate_power', 'Poder inato'], ['tactic', 'Tática'],
  ['reaction', 'Reação'], ['aura', 'Aura'], ['other', 'Outro'],
] as const;

export const spellModeOptions = [
  ['spell', 'Magia'], ['innate', 'Poder inato'], ['item', 'Poder de item'], ['special', 'Especial'],
] as const;

export const breathShapeOptions = [
  ['line', 'Linha'], ['cone', 'Cone'], ['cloud', 'Nuvem'], ['other', 'Outro'],
] as const;

export const saveAttributeOptions = [
  ['FOR', 'Força'], ['AGI', 'Agilidade'], ['SAÚ', 'Saúde'], ['INT', 'Inteligência'],
  ['SAB', 'Sabedoria'], ['PER', 'Percepção'],
] as const;
