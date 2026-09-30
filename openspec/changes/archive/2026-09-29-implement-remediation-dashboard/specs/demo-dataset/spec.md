## ADDED Requirements

### Requirement: Dataset de demo como fuente única
La app SHALL obtener todos sus datos del dataset `demo-data.js` del handoff (`window.RB_DATA`),
servido como asset estático, con `meta`, `fleet` y `repositories[slug]`. Ningún componente MUST
leer `window.RB_DATA` directamente: el acceso MUST pasar por un único módulo de datos que expone
el dataset tipado.

#### Scenario: Acceso encapsulado
- **WHEN** se busca `RB_DATA` en `src/`
- **THEN** sólo aparece dentro del módulo de acceso a datos

#### Scenario: Dataset cargado
- **GIVEN** `demo-data.js` servido junto a la app
- **WHEN** la app arranca
- **THEN** el Portfolio muestra los 70 repositorios de `fleet.repositories`

### Requirement: Contrato de acceso reemplazable
El módulo de datos SHALL exponer una interfaz asíncrona (por ejemplo, `loadDataset(): Promise<Dataset>`)
junto con los tipos TypeScript del modelo (`Meta`, `Fleet`, `FleetRepository`, `RepositoryDetail`,
`PlanLevel`, `DependencyUpdate`, `SastFile`, `SecretFile`, `Estimate`, etc.), de modo que reemplazar
la fuente por `vulnerabilities-api` no requiera cambios fuera de ese módulo.

#### Scenario: Estado de carga y error
- **WHEN** el dataset todavía no está disponible
- **THEN** la app muestra un estado de carga
- **WHEN** la carga falla
- **THEN** la app muestra un mensaje de error en lugar de una pantalla en blanco

### Requirement: Formato de valores en es-AR
Los valores SHALL formatearse como en el prototipo:
- Números: `toLocaleString('es-AR')`.
- USD: «USD 12,34», con dos decimales y coma.
- Tiempos: «—» para 0; «Ns» si es menor a 60 s; «Nm» si es menor a 60 min; «Hh MMm» si es menor a 24 h; «N.NNNh» desde 24 h.
- Severidades: «Critical», «High», «Medium», «Low».

#### Scenario: Formato de tiempo
- **WHEN** se formatean 0, 45, 1500, 5400 y 90000 segundos
- **THEN** los resultados son «—», «45s», «25m», «1h 30m» y «25h»

#### Scenario: Formato de USD
- **WHEN** se formatea 58.8
- **THEN** el resultado es «USD 58,80»
