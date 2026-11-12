# MMC secuencial

Módulo aislado en `secuencial/`. Solo se modifica el enlace de acceso a Secuencial en el selector común. No se cambian los archivos, cálculos, estilos ni datos de MMC simple, variable o compuesta. Se reutilizan sin modificar los estilos generales y la conversión común de horas.

## Documentación exclusiva

Adjuntos del 12 de noviembre de 2026:

- `OneDrive_1_12-11-2026.zip`: `1.ERGOepm SLI (9-3-12).xlsm`, `2.ERGOepm SLI-CLI (20-1-22).xlsm`, `2.ERGOepm SLI-VLI (20-1-22).xlsm`, `CÁLCULO DEL ÍNDICE DE RIESGO SECUENCIAL ILS.pdf`.
- `CONDICIONES ERGONOMICAS_V26_SEPTIEMBRE_2026 (3)(3).docx`.

No se ejecutan macros ni enlaces externos. No se incorporan metodologías, tablas o criterios ajenos a estos adjuntos.

## Procedimiento y alcance

Se implementa el flujo del PDF: registrar la rotación, evaluar cada tarea en los Excel secuenciales de la documentación e incorporar sus resultados parciales al agregador ILS. La página no recalcula los pesos y geometrías de las tareas ni toma automáticamente el índice final de los otros módulos. Ese único índice no reemplaza los cuatro resultados parciales que necesita el agregador.

Entrada de cada tarea: nombre, tipo simple/compuesta/variable, resultado numérico o crítico y los cuatro índices de referencia de 25 kg: intrínseco (H), corta (K), media (L), larga (M). Se admiten hasta 8 tareas: aunque el catálogo de la hoja permite nombrar hasta 12, el resultado T155 depende únicamente de las 8 filas 134–148.

Se puede pegar F:S desde los resúmenes: fila 41 de SLI-CLI; **fila 106 de SLI-VLI**. La guía menciona genéricamente 41/42, pero el resumen de la versión VLI adjunta está realmente en 105/106. Se usa el contenido efectivo del archivo. La importación comprueba los cuatro índices y que O (minutos de esa tarea) coincida con el horario; no cambia el estudio si falla una comprobación. La situación crítica se introduce expresamente mediante el selector.

El horario incluye inicio/fin de jornada y de cada tramo; admite medianoche. Se exige cobertura completa, sin huecos ni solapamientos. Cada tramo de MMC se vincula a una tarea. Los minutos y O/Q se calculan automáticamente. Los descansos de hasta 10 minutos se incluyen en el tramo de levantamiento conforme a la ayuda del Excel; si se registran separadamente, se solicita corregir el horario. La distribución se adapta a las 81 celdas B43:CD43, con hasta 20 bloques de levantamiento y de empuje. El botón de copia reproduce las dos filas B80:CD81 para pegar como valores en B15 de ESQUEMA de los Excel parciales; los nombres deben coincidir con E6.

Cambiar horarios, asignaciones, tareas o tipos invalida la confirmación de los resultados parciales. Es necesario actualizarlos y confirmar que corresponden al horario actual, también en la simulación. Esto evita presentar como recalculados unos índices que provienen de otra distribución temporal.

## Cálculo

`workbook-model.js` conserva el grafo de las fórmulas originales de `ILS!B69` y `ILS!T155`. `engine.js` evalúa ese grafo con entradas validadas, sin `eval`, macros ni accesos externos.

- La duración se obtiene de las fórmulas 45–58 y B69, incluidas sus condiciones de recuperación y acumulación. Se conserva que la comprobación efectiva de las fórmulas es de períodos <5 minutos, aunque la etiqueta de B69 indica <10. No se reemplaza este criterio por el de otro módulo.
- Las filas 134,136,...148 reciben H/K/L/M y los minutos O de cada tarea. Q = O/480: se conserva **480**, no se sustituye por la jornada introducida ni por los minutos totales de MMC.
- AJ selecciona K/L/M según B69. CY163 = máximo H; CZ163 = máximo AJ; DH163 = suma de AJ×Q; DH165 = DH163/CZ163; T155 = CY163 + (CZ163−CY163)×DH165.
- Se siguen literalmente los empates y las fórmulas, sin ordenar arbitrariamente las tareas ni omitir la contribución del máximo a la suma ponderada.
- El caso sin denominador numérico válido permanece pendiente; no se inventa un cero.
- ILS de los otros grupos = base×25/20, base×25/20 y base×25/15 según el PDF. Edades 20–45 / <20 o >45, bandas y colores del DOCX. Se clasifica antes de redondear a dos decimales, como en la interfaz establecida de los módulos.
- Un resultado parcial expresamente crítico genera situación crítica: >3 / MUY ALTO para todos los grupos, conforme al DOCX. No es un índice numérico calculado.

## Interfaz y persistencia

Cinco pantallas: estudio/tareas, horario, resultados parciales, informe y simulación. Sin evaluador, valores de ejemplo, Guardar como ni exportación de cálculos intermedios. La simulación es independiente y el resumen incluye solo cambios efectivos, sin marcas internas de confirmación. JSON específico `module:"secuencial"`; se rechazan los archivos de los otros módulos. Se conservan original y simulación, horas, resultados parciales y confirmaciones.

Guardar estudio, cargar, copiar resultados y simulación para Word. Aviso de cambios pendientes al cerrar mediante el diálogo nativo del navegador; al volver al inicio ofrece guardar, continuar o salir sin guardar. La salida se cancela si el guardado falla o se cancela. El navegador no permite imponer un guardado al cerrar.

## Verificación

`node tests/secuencial.cjs`

56 casos sintéticos contrastados con una evaluación independiente en Python de las fórmulas originales: las tres categorías de duración, recuperación, rotación, repetición de tarea, empuje, medianoche y hasta 8 tareas. Se comparan la duración y T155. Se comprueban también entradas en blanco, datos incompletos, críticas, escalado de población, límites de riesgo, aislamiento de simulación, cambios de horario, formato JSON, guardado/recarga, importación de filas y aviso de salida. Los casos están solo en `tests/fixtures/ils-excel.json`, nunca se cargan en la página.

La correspondencia con fórmulas no equivale a una ejecución nativa de Microsoft Excel. El módulo cubre la agregación secuencial según la guía, no sustituye los Excel de evaluación parcial.
