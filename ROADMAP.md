# 🚀 HOJA DE RUTA Y OBJETIVOS PENDIENTES - SCADA NODE3
**Versión:** 1.0.0  
**Fecha:** 2026-05-09  
**Autor:** Carlos Lara  

---

## 1. Interfaz y Estética Premium (Visual Excellence)
- [x] **Identidad Corporativa:** Insertar el logo de la empresa en la base del menú lateral izquierdo.
- [ ] **Iconografía de Máquina:** Añadir imágenes/fotos de las máquinas con fondo transparente en los paneles principales para mejorar la identificación visual.
- [ ] **Widgets Dinámicos:** Implementar vúmetros (vanguards), barras de progreso desplazables y otros elementos gráficos en HTML/CSS para representar temperaturas y niveles (evitar diseño "estático y triste").
- [x] **Favicon Global:** Aplicar el favicon dinámico (Verde/Violeta) según el estilo seleccionado.

## 2. Control y Mando (Layout)
- [ ] **Mando Maestro:** Crear panel general con botones de Start/Stop, Hidráulica, Resistencias y cambio de Modo (Auto/Man) para todas las máquinas.
- [ ] **Acceso Rápido:** Añadir botones miniatura de comando en las "mini-cards" de la vista de Layout para control directo sin cambiar de pestaña.
- [ ] **Identificación de Alarmas:** Incluir prefijo de máquina (M1-, M2-) en todas las descripciones de tags para evitar confusiones en sistemas multi-PLC.

## 3. Analítica de Producción
- [x] **Rotación Mensual:** Implementada la creación de archivos .jsonl por mes para evitar saturación de datos.
- [ ] **Dashboard Extendido:** Incluir desglose de consumos energéticos y eficiencia por turno.
- [ ] **Informes PDF:** Refinar el diseño de los reportes generados desde la página de Analítica.

## 4. Comunicaciones y Notificaciones
- [ ] **Sistema de Email:** Configurar `nodemailer` para envío de reportes diarios (fin de jornada) y alertas críticas instantáneas.
- [ ] **Configuración LAN 2:** Asegurar la salida a internet para correos sin comprometer la red del PLC.

## 5. Documentación y Ajustes PLC
- [ ] **Sección 9 del Manual:** Explicar la representación y lógica de los datos de producción.
- [ ] **Sincronización Maq. 1:** Ajustar offsets y tipos de datos finales tras completar la programación en TIA Portal.

---
*Este documento se actualizará a medida que se completen los hitos del proyecto.*
