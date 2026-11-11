# MMC Variable — modelo A

Módulo independiente de MMC Simple. Entrada en `variable/index.html`; `engine.js` contiene el motor sin dependencias de la interfaz.

## Fuentes autorizadas

- ES_ERGOepm_VLI__03-2025 (11).xlsx, aportado por el usuario.
- ACLARACIONES EXCEL CARGAS(1).pdf, aportado por el usuario.
- CONDICIONES ERGONOMICAS_V26_SEPTIEMBRE_2026 (3)(1).docx, aportado por el usuario.

No se han incorporado tablas ni criterios metodológicos de fuentes externas.

## Trazabilidad

- Producción y cinco categorías: `2.Datos produccion!C19:R54`, `U20:Y24`. Peso representativo ponderado redondeado a un decimal. Se conserva el orden de las filas activas. Las categorías con intervalos solapados asignan la carga a la primera coincidencia, como las fórmulas del archivo.
- Horario: `3.Organizacion!B10:CD25`. Se incluyen levantamiento, tareas sin MMC/descanso y empuje/tracción. La frecuencia de levantamiento utiliza únicamente los minutos netos de levantamiento y los objetos por trabajador.
- Geometrías: `4.Factores`, agregación de alturas por intervalos y distancias horizontales; `5.LI!AB31:AB65`. Modelo A, sin el selector de modelo B.
- FILI: `computation Table!K11:X40`. Dos áreas verticales (factores 0,78 y 1); tres horizontales (0,71; 0,56; 0,4); asimetría (1 o 0,81); agarre 0,9. El desplazamiento simplificado del archivo es 0 (factor DM=1); no se introduce el desplazamiento real de MMC Simple.
- Frecuencia: `computation Table!AZ59:BF1659`. `frequency-table.js` conserva los nodos de esa tabla y sus interpolaciones internas. La frecuencia de cada subtarea y la acumulada se redondean a dos decimales, como el archivo. Comprobados los 4.803 valores contra la tabla original: diferencia máxima inferior a 1e-12.
- ILV final: `5.Resultados!D88` → `5.LI!D88` → `computation Table!Z51` → `ES18`. Se forman seis categorías FILI con percentiles 0,8333; 0,6666; 0,5; 0,3333; 0,1666; 0. La primera contribución utiliza el máximo; las siguientes, la media aritmética de los FILI de la categoría. Se conserva MATCH con primera coincidencia y el divisor de extensión temporal.
- Clasificación y colores: tabla de niveles del DOCX (1; 1,5; 2; 3), aplicada antes de redondear. Las situaciones críticas se muestran como >3 / MUY ALTO en todos los grupos, conforme al DOCX.

## Comportamientos del Excel conservados

El horario del archivo sustituye la recuperación del último período por 500 minutos. La duración media exige un período superior a 60 y no superior a 120 minutos y recuperación al menos del 30 %. Los períodos activos se acumulan sin añadir el tiempo de los descansos insuficientes. Esto es específico de las fórmulas de este VLI; no se reutiliza el motor de horario de MMC Simple.

La síntesis del PDF se refiere a las categorías simplificadas, que pueden tener un peso medio menor que el mayor peso real. Los datos de producción originales permanecen en el estudio y se utilizan para la masa acumulada.

La versión inicial emite índices únicamente para levantamientos individuales con ambas manos. Los campos de una mano y levantamiento simultáneo entre personas no están disponibles en el editor y se bloquean si aparecen en un estudio importado. Sus correcciones presentan discrepancias entre cálculos intermedios y el ILV final del archivo fuente y requieren validación separada.

Si los límites de cinco categorías, redondeados como en el Excel, dejan una carga fuera de los intervalos, el programa solicita revisión y no asigna esa carga silenciosamente.

## Verificación

`node tests/variable.cjs`

El caso de referencia del archivo aportado (100 levantamientos de 18,5 kg, cuatro trabajadores, 115 minutos netos, duración corta, geometría 51–125 cm / H 25–40 cm y asimetría marcada) devuelve 1,4325681831794734 para la masa de referencia de 25 kg.
