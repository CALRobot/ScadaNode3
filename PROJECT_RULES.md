# 📑 PROTOCOLO TÉCNICO Y REGLAS DE DESARROLLO - SCADA NODE3
**Versión:** 1.1.0  
**Última Actualización:** 2026-05-09 | 08:42 AM  
**Estado:** VIGENTE / OBLIGATORIO

---

## 1. Descripción y Objetivos del Proyecto
SCADA industrial robusto para la monitorización, control y analítica de plantas de producción.
- **Visualización en Tiempo Real:** Monitorización de estados de máquina, temperaturas y variables críticas.
- **Control de Parámetros (Recetas):** Gestión dinámica de consignas y parámetros de producción.
- **Gestión de Alarmas:** Registro histórico de anomalías y avisos para análisis post-evento.
- **Data Logging & Analítica:** Registro de datos de producción (golpes, consumos, tiempos de ciclo) para generación de informes técnicos y KPIs offline.
- **Autonomía:** Operación 100% local (Edge Computing) sin dependencia de nubes o CDNs externas.

## 2. Recursos y Stack Tecnológico (ESTRICTO)
- **Runtime:** Node.js (v18+).
- **Comunicaciones PLC:** Librería `jsmodbus` + `net` (Socket TCP). **PROHIBIDO** el uso de `modbus-serial`.
- **Servidor Web:** Express.js en el **Puerto 4000**.
- **Canal de Datos:** `socket.io` para telemetría en tiempo real.
- **Frontend:** HTML5, CSS3 Moderno (Glassmorphism), JS Modular.
- **Librerías de Visualización:** `Chart.js` y `jsPDF` (Servidas localmente desde `/public/lib/`).

## 3. Organización de Archivos y Persistencia
- **📁 /config/**: Configuración estática del hardware y definición de Tags (`tags_plc1.js`, `plcs.json`). **LA FUENTE DE VERDAD.**
- **📁 /data/**: Persistencia de datos dinámicos generados por la operación:
    - `recipes.json`: Base de datos de recetas.
    - `alarms.jsonl`: Historial de alarmas (Append-only).
    - `production.jsonl`: Logs de analítica y producción (Append-only).
- **📁 /public/**: Interfaz de usuario, estilos, scripts de cliente y documentación técnica.

## 4. Protocolo de Seguridad (Flujo de Cambios)
Para garantizar la integridad en entornos industriales, CUALQUIER cambio debe seguir este orden:
1.  **ANÁLISIS:** Verificación de `package.json` y código base.
2.  **PROPUESTA:** Explicación detallada del cambio al usuario.
3.  **BACKUP:** Copia obligatoria a `/backups/YYYY-MM-DD_HHMM_[archivo]`.
4.  **APROBACIÓN:** Esperar confirmación explícita del usuario.
5.  **EJECUCIÓN:** Aplicar cambios con validación de sintaxis.
6.  **DOCUMENTACIÓN:** Actualizar `walkthrough.md` y `manual.html`.

## 5. Blindaje de Versiones Estables
- **Carpeta `/stable`**: Contendrá el backup TOTAL de la última versión estable del proyecto.
- **Regla Estricta:** La IA solo creará o actualizará esta carpeta cuando el usuario dé la orden explícita: **"SOBREESCRIBE STABLE"**. Bajo ninguna otra circunstancia la IA puede tocar, modificar o sobrescribir el contenido de `/stable`. Esta carpeta es el último recurso de restauración manual del usuario.

---

## 6. Comunicación y Metodología de Trabajo
Para asegurar el éxito y evitar el estrés en el desarrollo:
1.  **Un Objetivo por vez:** No se iniciarán múltiples tareas simultáneamente. Se abrirá, ejecutará y cerrará un hito del `ROADMAP.md` antes de pasar al siguiente.
2.  **Referencia a las Reglas:** En cada propuesta o pregunta importante, la IA debe confirmar que ha revisado este documento y que su propuesta cumple con los puntos aquí descritos.
3.  **Confirmación de Entorno:** Antes de ejecutar cambios en el servidor, la IA debe confirmar verbalmente que el puerto sigue siendo el 4000 y la librería `jsmodbus`.
4.  **Localización Obligatoria (España):** Todas las fechas y horas mostradas en el SCADA deben seguir el formato `es-ES` (DD/MM/YYYY HH:MM:SS). Se prohíbe el uso de formatos americanos (MM/DD/YYYY).

---
## 7. Modelo de Solicitud (Para el Usuario)
Carlos, para que yo no me pierda, puedes usar este formato cuando me pidas algo:
> **OBJETIVO:** [Nombre del punto del ROADMAP]  
> **CONTEXTO:** Revisa el archivo `@PROJECT_RULES.md` y el archivo `[nombre_del_archivo.js]`.  
> **TAREA:** [Descripción de lo que quieres hacer].  
> **REGLA:** Confirma que el puerto es el 4000 y usas jsmodbus.

---
## 8. Arquitectura del Frontend (Tema Morado Modular)
- **Estilo Visual:** Tema oscuro moderno basado en tonos morados (`#4c1d95`, `#7c3aed`, etc.). Están prohibidos los estilos neón llamativos y el botón de cambio de tema (solo habrá un tema).
- **Estructura Shell:** `index.html` es únicamente el contenedor base (menú lateral y barra superior). Solo contiene los accesos a "Inicio" y "Registros" (por ahora).
- **Aislamiento por Página:** Cada página del SCADA se carga dinámicamente desde la carpeta `/public/pages/`.
- **Regla de Tres Archivos:** Cada página independiente DEBE tener su propio trío de archivos con el mismo nombre para evitar conflictos globales:
  - HTML en `public/pages/[nombre].html`
  - CSS en `public/css/[nombre].css`
  - JS en `public/js/[nombre].js`
- **Regla de Botones Críticos:** Todos los botones de "STOP", "PARO" o "RESET" deben usar obligatoriamente el tema morado oscuro (`#4c1d95`) con texto blanco para asegurar contraste y visibilidad, evitando el uso de grises o colores apagados.

---
*Este documento es el contrato de confianza entre el Usuario y el Desarrollador (IA).*
