<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual del SCADA - Documentación Técnica</title>
  <!-- Favicones vectoriales: Monitor negro con borde verde fluo, y el de abajo al reves, que es el que se ve -->
  <link rel="icon"
    href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect x=%2210%22 y=%2210%22 width=%2280%22 height=%2260%22 rx=%225%22 fill=%22black%22 stroke=%22%230f0%22 stroke-width=%225%22/><path d=%22M30 70 L20 90 L80 90 L70 70%22 fill=%22black%22 stroke=%22%230f0%22 stroke-width=%225%22/></svg>">
  <link rel="icon" href="data:image/svg+xml,
    <svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22>
      <rect x=%2210%22 y=%2210%22 width=%2280%22 height=%2260%22 rx=%225%22
            fill=%22%230f0%22 stroke=%22black%22 stroke-width=%225%22/>
      <path d=%22M30 70 L20 90 L80 90 L70 70%22
            fill=%22%230f0%22 stroke=%22black%22 stroke-width=%225%22/>
    </svg>">
  <style>
    @import url('/lib/fonts/inter.css');

    :root {
      --bg-color: #121212;
      --surface-color: #1e1e1e;
      --primary-color: #00ff00;
      --text-color: #e0e0e0;
      --text-muted: #aaaaaa;
      --border-color: #333;
    }

    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Sidebar Navigation */
    .sidebar {
      width: 280px;
      background-color: var(--surface-color);
      border-right: 1px solid var(--border-color);
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .sidebar h2 {
      color: var(--primary-color);
      margin: 0 20px 20px 20px;
      font-size: 1.2rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .sidebar ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sidebar li a {
      display: block;
      padding: 10px 20px;
      color: var(--text-color);
      text-decoration: none;
      transition: background 0.2s, color 0.2s;
      border-left: 3px solid transparent;
    }

    .sidebar li a:hover {
      background-color: rgba(0, 255, 0, 0.1);
      color: var(--primary-color);
      border-left-color: var(--primary-color);
    }

    /* Main Content */
    .content {
      flex: 1;
      padding: 40px;
      overflow-y: auto;
      scroll-behavior: smooth;
    }

    .content-inner {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      color: var(--primary-color);
      font-size: 2.5rem;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 10px;
      margin-top: 0;
    }

    h3 {
      color: #fff;
      margin-top: 40px;
      font-size: 1.5rem;
    }

    p,
    li {
      line-height: 1.6;
      color: var(--text-muted);
      font-size: 1rem;
    }

    code {
      background-color: #2d2d2d;
      color: #a6e22e;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }

    pre {
      background-color: #2d2d2d;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid var(--primary-color);
      overflow-x: auto;
    }

    pre code {
      background-color: transparent;
      color: #e0e0e0;
      padding: 0;
      font-size: 0.9rem;
    }

    /* Keyword Highlights for Code */
    .kw {
      color: #f92672;
    }

    /* Keywords */
    .fn {
      color: #66d9ef;
    }

    /* Functions */
    .str {
      color: #e6db74;
    }

    /* Strings */
    .cmt {
      color: #75715e;
      font-style: italic;
    }

    /* Comments */
    .num {
      color: #ae81ff;
    }

    /* Numbers */

    section {
      margin-bottom: 60px;
      padding-top: 20px;
    }

    .alert {
      background-color: rgba(0, 255, 0, 0.05);
      border: 1px solid var(--primary-color);
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }

    .alert strong {
      color: var(--primary-color);
    }
  </style>
</head>

<body>

  <!-- Menu lateral -->
  <nav class="sidebar">
    <h2>Índice</h2>
    <ul>
      <li><a href="#instalacion">1. Instalación y Auto-arranque</a></li>
      <li><a href="#estructura">2. Estructura de Archivos (Files Tree)</a></li>
      <li><a href="#intro">3. Introducción al Sistema</a></li>
      <li><a href="#comunicacion">4. Comunicación (Modbus & Sockets)</a></li>
      <li><a href="#lectura">5. Lectura de Datos</a></li>
      <li><a href="#escritura">6. Escritura y Comandos</a></li>
      <li><a href="#pulsadores">7. Botones y Pulsadores</a></li>
      <li><a href="#alarmas">8. Historial de Alarmas</a></li>
      <li><a href="#recetas">9. Sistema de Recetas</a></li>
      <li><a href="#multiplc">10. Múltiples PLCs</a></li>
      <li><a href="#analitica" style="color: #7c3aed; font-weight: 600;">11. Analítica y Producción</a></li>
    </ul>
  </nav>

  <!-- Contenido principal -->
  <main class="content">
    <div class="content-inner">
      <h1>Manual del SCADA Node3</h1>
      <p>Bienvenido al manual técnico de tu SCADA. Este documento explica cómo interactúan las distintas partes del
        sistema (Node.js, HTML/JS en el navegador y el PLC vía Modbus).</p>

      <!-- SECCIÓN 1: INSTALACIÓN -->
      <section id="instalacion">
        <h3>1. Instalación y Auto-arranque</h3>
        <p>Para poner en marcha el SCADA en un ordenador nuevo, sigue estos pasos estrictamente:</p>
        
        <h4>A. Requisitos previos</h4>
        <ul>
          <li><strong>Node.js:</strong> Descarga e instala la versión LTS desde <a href="https://nodejs.org" target="_blank" style="color:var(--primary-color)">nodejs.org</a>.</li>
          <li><strong>Acceso de Red:</strong> El PC debe tener una IP fija en el mismo rango que los PLCs (ej: 192.168.0.XXX).</li>
        </ul>

        <h4>B. Instalación del Software</h4>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid #7c3aed; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
          <strong>⚠️ NOTA TÉCNICA IMPORTANTE:</strong>
          <ul>
            <li><strong>Librería Modbus:</strong> Este SCADA utiliza <code>jsmodbus</code> específicamente para comunicación TCP/IP optimizada.</li>
            <li><strong>Puerto de Red:</strong> El servidor escucha en el <strong>Puerto 4000</strong>. Asegúrese de que el Firewall de Windows permita este puerto.</li>
            <li><strong>Package.json:</strong> Las dependencias críticas son <code>express</code>, <code>socket.io</code> y <code>jsmodbus</code>.</li>
          </ul>
        </div>
        <ol>
          <li>Copia la carpeta <code>ScadaNode3</code> al disco local (recomendado <code>C:\ScadaNode3</code>).</li>
          <li>Abre una terminal (PowerShell o CMD) en esa carpeta.</li>
          <li>Ejecuta el comando: <code>npm install</code>. Esto descargará todas las librerías necesarias.</li>
        </ol>

        <h4>C. Configuración de Auto-arranque (Windows)</h4>
        <p>Para que el SCADA arranque solo al encender el PC y se reinicie si hay un error, usamos <strong>PM2</strong>:</p>
        <ol>
          <li>Instala PM2 globalmente: <code>npm install pm2 -g</code></li>
          <li>Inicia el servidor: <code>pm2 start server.js --name "SCADA-NODE3"</code></li>
          <li>Guarda la configuración: <code>pm2 save</code></li>
          <li>Para que arranque con Windows, instala el servicio de inicio: <code>npm install pm2-windows-startup -g</code> y luego ejecuta <code>pm2-startup install</code>.</li>
        </ol>
        <div class="alert">
          <strong>Tip:</strong> Puedes ver el estado del servidor en tiempo real con el comando <code>pm2 monit</code>.
        </div>
      </section>

      <!-- SECCIÓN 2: ESTRUCTURA -->
      <section id="estructura">
        <h3>2. Estructura de Archivos (Files Tree)</h3>
        <p>El proyecto está organizado de forma modular para separar la lógica del servidor de la interfaz de usuario.</p>
        
        <pre><code>ScadaNode3/
├── server.js              <span class="cmt">// El corazón del sistema (Backend)</span>
├── config/                <span class="cmt">// Configuración de hardware</span>
│   ├── plcs.json          <span class="cmt">// IPs y puertos de los PLCs</span>
│   └── tags_plc1.js       <span class="cmt">// Diccionario de variables (Words/Bits)</span>
├── data/                  <span class="cmt">// Persistencia de datos</span>
│   ├── alarms.jsonl       <span class="cmt">// Historial de alarmas</span>
│   ├── production.jsonl   <span class="cmt">// Datos históricos para analítica</span>
│   └── recipes.json       <span class="cmt">// Base de datos de recetas</span>
├── public/                <span class="cmt">// Interfaz Web (Frontend)</span>
│   ├── index.html         <span class="cmt">// Página principal del SCADA</span>
│   ├── analytics.html     <span class="cmt">// Dashboard de analítica y gráficas</span>
│   ├── js/                <span class="cmt">// Lógica del navegador</span>
│   │   ├── main.js        <span class="cmt">// Gestión de pestañas y sockets globales</span>
│   │   ├── m1.js          <span class="cmt">// Control específico de la Máquina 1</span>
│   │   ├── alarms.js      <span class="cmt">// Lógica de la tabla de alarmas</span>
│   │   ├── recipes.js     <span class="cmt">// Gestión de recetas y envío al PLC</span>
│   │   └── analytics.js   <span class="cmt">// Renderizado de gráficas (Chart.js)</span>
│   ├── css/               <span class="cmt">// Estilos Visuales</span>
│   │   ├── main.css       <span class="cmt">// Estilos base y layout</span>
│   │   └── modern.css     <span class="cmt">// Tema premium (Violets/Glassmorphism)</span>
│   ├── lib/               <span class="cmt">// Librerías Locales (Offline)</span>
│   │   ├── chart.umd.min.js <span class="cmt">// Motor de gráficas</span>
│   │   ├── jspdf.umd.min.js <span class="cmt">// Generador de PDFs</span>
│   │   └── fonts/         <span class="cmt">// Fuente Inter (local)</span>
│   └── doc/               <span class="cmt">// Documentación (este manual)</span>
└── node_modules/          <span class="cmt">// Librerías de Node.js</span></code></pre>

        <h4>Flujo de Datos</h4>
        <ol>
          <li><strong>PLC:</strong> Almacena los datos en registros Modbus.</li>
          <li><strong>server.js:</strong> Lee al PLC cada 500ms y "emite" los datos por WebSockets.</li>
          <li><strong>Navegador:</strong> Recibe los datos y los dibuja en pantalla (luces, textos, gráficas).</li>
          <li><strong>Acción del Usuario:</strong> Al pulsar un botón, el navegador envía una orden al servidor, y este escribe en el PLC.</li>
        </ol>
      </section>

      <!-- SECCIÓN 3 -->
      <section id="intro">
        <h3>3. Introducción al Sistema</h3>
        <p>El SCADA se divide en dos grandes piezas:</p>
        <ul>
          <li><strong>El Backend (Servidor):</strong> Es el archivo <code>server.js</code>. Funciona continuamente en
            segundo plano utilizando Node.js. Es el único que "habla" directamente con el PLC (a través de TCP/IP usando
            el protocolo Modbus).</li>
          <li><strong>El Frontend (Navegador):</strong> Son los archivos HTML, CSS y JS de la carpeta
            <code>public</code>. Muestran la interfaz gráfica y solo se comunican con el Backend a través de
            "WebSockets" (Socket.io), nunca hablan directo con el PLC.</li>
        </ul>
      </section>

      <!-- SECCIÓN 4 -->
      <section id="comunicacion">
        <h3>4. Comunicación (Modbus & Sockets)</h3>
        <p>El servidor Node.js tiene un ciclo continuo llamado "Polling". Cada 500 milisegundos, le hace una pregunta al
          PLC: <em>"Oye, dame el valor de tus palabras desde la W0 hasta la W59"</em>.</p>

        <p>Cuando el servidor recibe esos datos del PLC, los empaqueta y los "grita" a todas las páginas web conectadas
          usando WebSockets. Esto se hace mediante el evento <code>plc_update</code>.</p>

        <pre><code><span class="cmt">// server.js: Envío periódico a la web</span>
io.<span class="fn">emit</span>(<span class="str">'plc_update'</span>, {
  id: <span class="str">'PLC1'</span>,
  status: <span class="kw">true</span>,
  regs: memoria,     <span class="cmt">// Arreglo crudo [12, 0, 512, ...]</span>
  tags: tagsValues   <span class="cmt">// Diccionario amigable { FBK_POMPA_ACCESA: 1, ... }</span>
});</code></pre>

        <p>En tu navegador, cada página tiene una función que "escucha" este grito y actualiza las luces y textos de la
          pantalla:</p>

        <pre><code><span class="cmt">// public/js/main.js: El navegador recibe los datos</span>
socket.<span class="fn">on</span>(<span class="str">'plc_update'</span>, (<span class="kw">data</span>) =&gt; {
  <span class="fn">m1_update</span>(data); <span class="cmt">// Actualiza la pestaña de la máquina 1</span>
});</code></pre>
      </section>

      <!-- SECCIÓN 5 -->
      <section id="lectura">
        <h3>5. Lectura de Datos (Tags vs Words)</h3>
        <p>Las palabras (Words) Modbus son números de 16 bits (desde 0 hasta 65535). Trabajar directamente con el
          registro <code>W14</code> es confuso. Por eso usamos un diccionario (Tags) en
          <code>config/tags_plc1.js</code>.</p>
        <p>El servidor usa una función mágica llamada <code>buildTagValues</code>. Esta función lee tu lista de Tags y,
          si un Tag especifica un "bit", extrae solo ese bit. Si no, extrae la palabra entera.</p>

        <pre><code><span class="cmt">// Ejemplo de Tag de un Bit (Luz)</span>
{ name: <span class="str">'FBK_START_CICLO'</span>, word: <span class="num">1</span>, bit: <span class="num">9</span> }

<span class="cmt">// Ejemplo de Tag de una Palabra (Temperatura)</span>
{ name: <span class="str">'TEMP_SP_SUP'</span>, word: <span class="num">14</span>, bit: <span class="kw">null</span> }</code></pre>

        <p>Por eso en tu código <code>m1.js</code> (en el navegador) puedes encender un LED usando nombres fáciles en
          vez de lidiar con máscaras de bits:</p>
        <pre><code><span class="kw">if</span> (tags.FBK_START_CICLO) ledCiclo.classList.<span class="fn">add</span>(<span class="str">'on'</span>);</code></pre>
      </section>

      <!-- SECCIÓN 6 -->
      <section id="escritura">
        <h3>6. Escritura y Comandos (Sistema Read-Modify-Write)</h3>
        <p>Cuando pulsas un botón, el navegador envía una orden al servidor. Para mayor seguridad, el sistema utiliza
          ahora un mecanismo de <strong>escritura de bits individuales</strong>.</p>
        <div class="alert">
          <strong>Mejora de Seguridad:</strong> El servidor ya no sobrescribe la palabra entera a ciegas. Ahora recibe
          el evento <code>escribir_bit</code>, lee el valor actual de la palabra en su memoria, cambia solo el bit
          solicitado y envía el resultado al PLC. Esto evita interferencias si otros bits de la misma palabra (ej. W60 o
          W61) cambian al mismo tiempo.
        </div>

        <p>En el navegador, la función <code>m1_setBit</code> es ahora mucho más sencilla, delegando la matemática al
          servidor:</p>

        <pre><code><span class="kw">function</span> <span class="fn">m1_setBit</span>(addr, bit, value) {
  <span class="cmt">// Enviamos la dirección, el número de bit (0-15) y el valor deseado (1 o 0)</span>
  socket.<span class="fn">emit</span>(<span class="str">'escribir_bit'</span>, { id: <span class="str">'PLC1'</span>, addr, bit, value });
}</code></pre>
      </section>

      <!-- SECCIÓN 7 -->
      <section id="pulsadores">
        <h3>7. Botones y Pulsadores (Flancos)</h3>
        <p>En los PLC, botones como el "Start" o el "Reset" suelen reaccionar al <strong>flanco de subida</strong> (el
          instante en que la señal pasa de 0 a 1).</p>
        <p>Si el SCADA manda un <code>1</code> y nunca lo devuelve a <code>0</code>, el PLC recibe el primer 1, ejecuta
          la acción, pero si lo presionas otra vez, el PLC sigue viendo un 1; ¡no hay nuevo flanco!</p>
        <p>Para solucionar esto, simulamos un <strong>Pulsador Momentáneo</strong> que presiona y suelta el botón medio
          segundo (500ms) después:</p>

        <pre><code><span class="kw">function</span> <span class="fn">m1_cmdStartCiclo</span>() {
  <span class="cmt">// 1. El dedo presiona: Envía un '1' al bit 9</span>
  <span class="fn">m1_setBit</span>(CMD_ADDR_CICLO, <span class="num">9</span>, <span class="num">1</span>);  
  
  <span class="cmt">// 2. El dedo suelta: Espera 500ms y envía un '0' al mismo bit</span>
  <span class="fn">setTimeout</span>(() =&gt; <span class="fn">m1_setBit</span>(CMD_ADDR_CICLO, <span class="num">9</span>, <span class="num">0</span>), <span class="num">500</span>);
}</code></pre>
      </section>

      <!-- SECCIÓN 8 -->
      <section id="alarmas">
        <h3>8. Historial de Alarmas (JSON Lines)</h3>
        <p>El servidor guarda el historial de alarmas de manera inteligente. En cada lectura del PLC, compara el estado
          actual de todas las alarmas con el estado anterior que tenía guardado en memoria.</p>
        <p>Si detecta que una alarma (ej. <code>TERMICO_RES_SUP_INTERV</code>) pasó de 0 a 1, inmediatamente escribe una
          línea en el archivo <code>data/alarms.jsonl</code>. Este archivo tiene formato <strong>JSON Lines</strong>
          (cada salto de línea es un objeto de texto plano perfecto e independiente):</p>

        <pre><code>{"date":"2026-05-06T12:00:00.000Z","tag":"EMERGENZA_PREMUTA","desc":"Emergencia pulsada","status":"ACTIVADA"}
{"date":"2026-05-06T12:05:30.000Z","tag":"EMERGENZA_PREMUTA","desc":"Emergencia pulsada","status":"NORMALIZADA"}</code></pre>

        <p>Luego, la página web simplemente hace una petición a <code>/api/alarms/history</code>, descarga estas líneas,
          las voltea (para mostrar las nuevas arriba) y genera la tabla.</p>
      </section>

      <!-- SECCIÓN 9 -->
      <section id="recetas">
        <h3>9. Sistema de Recetas (CRUD y PLC)</h3>
        <p>El sistema de recetas combina una base de datos ligera con escritura intensiva de Modbus. Funciona en dos
          etapas muy bien separadas:</p>

        <h4>Almacenamiento (La Base de Datos)</h4>
        <p>Las recetas no se guardan en el PLC, se guardan en el servidor Node.js en un archivo llamado
          <code>data/recipes.json</code>. El frontend (la web) se comunica con el backend mediante API HTTP clásica
          (GET, POST, PUT, DELETE) para crear, editar o borrar recetas.</p>
        <ul>
          <li><code>GET /api/recipes</code>: El navegador pide la lista completa para armar la tabla verde.</li>
          <li><code>POST /api/recipes</code>: Cuando pulsas <strong>Guardar</strong> en una receta nueva, se envía y se
            añade al archivo JSON.</li>
        </ul>

        <h4>Envío al PLC (Carga de Producción)</h4>
        <p>Cuando pulsas el botón <strong>"Enviar al PLC"</strong>, el navegador lee todos los parámetros de la receta
          seleccionada (Espesor, Empuje, Temperaturas, etc.) y hace un bucle (un bucle for/forEach) emitiendo eventos
          <code>escribir</code> por WebSocket uno por uno:</p>

        <pre><code><span class="cmt">// public/js/recipes.js: Bucle de escritura</span>
RECIPE_FIELDS.<span class="fn">forEach</span>(field =&gt; {
  <span class="kw">const</span> val = <span class="fn">parseInt</span>(recipe.values[field.key], <span class="num">10</span>) || <span class="num">0</span>;
  socket.<span class="fn">emit</span>(<span class="str">'escribir'</span>, { 
    id: <span class="str">'PLC1'</span>, 
    addr: field.addr, <span class="cmt">// W62 a W76</span>
    value: val 
  });
});</code></pre>

        <p>El servidor Node recibe esta avalancha de peticiones y, para no saturar al PLC Siemens, usa
          <code>writeSingleRegister</code> y encola las peticiones si es necesario. A los 500ms (en el siguiente Polling
          de lectura), el SCADA refrescará la pantalla mostrando los nuevos valores leídos del PLC.</p>
      </section>

      <!-- SECCIÓN 10 -->
      <section id="multiplc">
        <h3>10. Múltiples PLCs y Configuración</h3>
        <p>El SCADA está diseñado con arquitectura modular para escalar a decenas de PLCs. Node.js maneja múltiples
          conexiones Modbus de forma asíncrona (es decir, atiende a PLC1 y PLC2 de forma simultánea sin que uno
          ralentice al otro).</p>

        <h4>1. Configuración del Archivo <code>plcs.json</code></h4>
        <p>Añadir una segunda máquina es tan sencillo como duplicar el bloque JSON en <code>config/plcs.json</code> y
          cambiar su <code>id</code> y su <code>host</code> (IP):</p>
        <pre><code>{
  <span class="str">"devices"</span>: [
    {
      <span class="str">"id"</span>: <span class="str">"PLC1"</span>,
      <span class="str">"host"</span>: <span class="str">"192.168.0.1"</span>,
      <span class="str">"port"</span>: <span class="num">505</span>,
      ...
    },
    {
      <span class="str">"id"</span>: <span class="str">"PLC2"</span>,
      <span class="str">"host"</span>: <span class="str">"192.168.0.2"</span>,
      ...
    }
  ]
}</code></pre>

        <h4>2. Instanciación en <code>server.js</code></h4>
        <p>El servidor tiene una función fábrica llamada <code>createPlcController</code>. Crea un controlador aislado
          para PLC2 pasándole sus tags propios:</p>
        <pre><code><span class="kw">const</span> plc2Device = devices.<span class="fn">find</span>(d =&gt; d.id === <span class="str">'PLC2'</span>);
plcControllers.PLC2 = <span class="fn">createPlcController</span>(plc2Device, tagsPlc2);</code></pre>

        <h4>3. El Navegador (Frontend)</h3>
          <p>El evento WebSocket <code>plc_update</code> enviará ahora paquetes tanto de PLC1 como de PLC2. El
            identificador mágico es <code>data.id</code>. En tu JavaScript, debes redirigir la información a la pestaña
            de máquina correcta:</p>
          <pre><code>socket.<span class="fn">on</span>(<span class="str">'plc_update'</span>, (<span class="kw">data</span>) =&gt; {
  <span class="kw">if</span> (data.id === <span class="str">'PLC1'</span>) <span class="fn">m1_update</span>(data);
  <span class="kw">else if</span> (data.id === <span class="str">'PLC2'</span>) <span class="fn">m2_update</span>(data);
});</code></pre>
          <p>Igualmente, para enviar un botón a la Máquina 2, solo cambias el ID en la emisión:
            <br><code>socket.emit('escribir', { id: 'PLC2', addr: 60, value: 512 })</code></p>
      </section>

      <!-- SECCIÓN 11 -->
      <section id="analitica">
        <h3 style="color: #7c3aed;">11. Analítica y Producción (Data Logging)</h3>
        <p>El sistema ha evolucionado de un simple panel de control a una herramienta de gestión de eficiencia. Esta sección explica cómo se capturan y representan los datos de producción.</p>

        <h4>Registro de Datos (Backend)</h4>
        <p>El servidor <code>server.js</code> ejecuta una tarea programada que realiza una "fotografía" de los tags clave del PLC. Esta captura se guarda en el archivo <code>data/production.jsonl</code> utilizando el formato JSON Lines.</p>
        <p>A diferencia de las alarmas (que se graban por evento), la producción se graba por <strong>intervalo de tiempo</strong>. El intervalo por defecto es de 30 minutos, pero puede ser ajustado dinámicamente desde el dashboard.</p>

        <pre><code><span class="cmt">// server.js: Captura de snapshot de producción</span>
<span class="kw">function</span> <span class="fn">logAllPlcsProduction</span>() {
  <span class="kw">const</span> snapshot = {
    timestamp: <span class="kw">new Date</span>().<span class="fn">toISOString</span>(),
    plc: <span class="str">'PLC1'</span>,
    PROD_ACTUAL_GOLPES: tags.PROD_ACTUAL_GOLPES,
    CONSUMO_ENERG_ACTUAL: tags.CONSUMO_ENERG_ACTUAL,
    ...
  };
  fs.<span class="fn">appendFileSync</span>(<span class="str">'data/production.jsonl'</span>, <span class="kw">JSON</span>.<span class="fn">stringify</span>(snapshot) + <span class="str">'\n'</span>);
}</code></pre>

        <h4>Visualización (Dashboard)</h4>
        <p>La página <code>analytics.html</code> utiliza la librería <strong>Chart.js</strong> para convertir los miles de líneas de datos en gráficos comprensibles:</p>
        <ul>
          <li><strong>Producción:</strong> Gráfico de líneas que muestra el acumulado de golpes.</li>
          <li><strong>Eficiencia:</strong> Evolución del tiempo de ciclo en segundos.</li>
          <li><strong>Temperaturas:</strong> Comparativa histórica de las temperaturas de los moldes.</li>
          <li><strong>Energía:</strong> Gráficos de barras con el consumo eléctrico en kW.</li>
        </ul>

        <h4>Configuración del Intervalo</h4>
        <p>Desde el Dashboard, el usuario puede modificar la frecuencia de muestreo. Al pulsar "Aplicar", se envía una petición <code>POST</code> a la API <code>/api/production/interval</code>, que reinicia el temporizador del servidor sin necesidad de reiniciar el SCADA.</p>

        <div class="alert" style="border-color: #7c3aed;">
          <strong>Exportación PDF:</strong> Se utiliza la librería <code>jsPDF</code> para generar reportes técnicos en el lado del cliente. El informe incluye un resumen de los KPIs (indicadores clave de rendimiento) y una tabla con los últimos 100 registros cronológicos para su impresión o archivo.
        </div>
      </section>

    </div>
  </main>

</body>

</html>