# Asistente Stream

Un asistente inteligente que analiza tu pantalla periódicamente y genera comentarios por voz usando IA.

## 🚀 Características

- **Captura automática de pantalla** cada 30 segundos (configurable)
- **Selección de monitor específico** (monitor 1, 2, 3 o todos)
- **Análisis inteligente** usando OpenAI GPT-4 Vision
- **Generación de comentarios** contextual y conversacional con personalidad sarcástica
- **Personalidad personalizable** desde la interfaz web
- **Síntesis de voz** usando Applio TTS
- **Reproducción automática** de comentarios por voz
- **Interfaz web completa** para control en tiempo real
- **Gestión automática** de archivos (limpieza de antiguos)

## 📋 Requisitos

- Node.js 18 o superior
- API Key de OpenAI
- Applio ejecutándose en puerto 6969 (para TTS)

## 🛠️ Instalación

1. **Clona o descarga el proyecto**
```bash
cd AsistenteStream
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura las variables de entorno**
```bash
# Copia el archivo de ejemplo
copy .env.example .env

# Edita .env y agrega tu API key de OpenAI
```

4. **Configura tu archivo .env**
```env
OPENAI_API_KEY=tu_api_key_de_openai_aqui
SCREENSHOT_INTERVAL=30000
APPLIO_URL=http://127.0.0.1:6969
TTS_MODEL=fr-FR-RemyMultilingualNeural
MONITOR_INDEX=1
SCREENSHOTS_DIR=screenshots
AUDIO_DIR=audio
AUTO_PLAY=true
PLAYBACK_METHOD=auto
```

## 🎯 Uso

### Ejecución con interfaz web (Recomendado)
```bash
# Inicia la interfaz web en http://localhost:3000
npm run web

# Luego abre http://localhost:3000 en tu navegador para controlar el asistente
```

### Ejecución directa por terminal
```bash
# Inicia el asistente directamente (se ejecuta cada 30 segundos)
npm start
```

### Ejecución única (para testing)
```bash
# Ejecuta solo un ciclo
node index.js --once
```

### Modo desarrollo
```bash
# Con auto-restart al cambiar archivos
npm run dev
```

## 📁 Estructura del proyecto

```
AsistenteStream/
├── index.js              # Aplicación principal
├── applio-client.js      # Cliente para TTS con Applio
├── screen-capture.js     # Captura de pantalla
├── vision-analyzer.js    # Análisis con OpenAI
├── package.json          # Dependencias
├── .env.example          # Variables de entorno ejemplo
├── screenshots/          # Capturas temporales
└── audio/               # Archivos de audio generados
```

## ⚙️ Configuración

### Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `OPENAI_API_KEY` | API Key de OpenAI | **Requerido** |
| `SCREENSHOT_INTERVAL` | Intervalo en milisegundos | `30000` (30s) |
| `APPLIO_URL` | URL de Applio para TTS | `http://127.0.0.1:6969` |
| `TTS_MODEL` | Modelo de voz | `fr-FR-RemyMultilingualNeural` |
| `MONITOR_INDEX` | Monitor a capturar (0=todos, 1=principal, 2=segundo, etc.) | `1` |
| `SAVE_SCREENSHOTS` | Guardar capturas como archivos PNG | `true` |
| `SCREENSHOTS_DIR` | Directorio de capturas | `screenshots` |
| `AUDIO_DIR` | Directorio de audio | `audio` |
| `AUTO_PLAY` | Reproducir audio automáticamente | `true` |
| `PLAYBACK_METHOD` | Método de reproducción | `auto` |

### Personalización del análisis

Puedes modificar el prompt del sistema en `vision-analyzer.js` para cambiar el comportamiento del asistente:

```javascript
// En getSystemPrompt()
return `Eres un asistente virtual que...`;
```

### Configuración de reproducción de audio

El asistente soporta diferentes métodos de reproducción:

- **`auto`** (recomendado): Intenta PowerShell primero, luego fallback a simple
- **`powershell`**: Usa PowerShell con MediaPlayer (control completo)
- **`simple`**: Abre con el reproductor predeterminado del sistema
- **`wmp`**: Usa Windows Media Player (si está disponible)

```env
# Deshabilitar reproducción automática
AUTO_PLAY=false

# Cambiar método de reproducción
PLAYBACK_METHOD=simple
```

## 🌐 Interfaz Web

La interfaz web proporciona control completo sobre el asistente:

### 🎮 Características del Panel Web:
- **Control en tiempo real**: Iniciar/detener el asistente
- **Configuración dinámica**: Cambiar intervalo, método de reproducción, monitor, etc.
- **Selección de monitor**: Cambiar qué monitor capturar en tiempo real
- **Personalidad personalizable**: Modificar la personalidad del asistente desde la interfaz
- **Logs en vivo**: Ver la actividad del asistente en tiempo real
- **Gestión de audios**: Reproducir y descargar comentarios generados
- **Estadísticas**: Ciclos ejecutados, archivos generados, estado del sistema
- **Ejecución única**: Probar el asistente sin intervalos

### 🚀 Cómo usar la interfaz web:

1. **Inicia el servidor web:**
   ```bash
   npm run web
   ```

2. **Abre tu navegador** en: `http://localhost:3000`

3. **Controla el asistente** desde la interfaz:
   - Click "▶️ Iniciar" para comenzar el monitoreo automático
   - Ajusta el "Intervalo entre análisis" (5-300 segundos)
   - Cambia configuraciones y guarda con "💾 Guardar Configuración"
   - Ve logs en tiempo real en la sección "📋 Logs del Sistema"
   - Escucha audios generados en "🎵 Audios Recientes"

### 📱 Panel de Control incluye:
- **Estado en tiempo real** del asistente
- **Configuración de intervalo** de análisis (slider interactivo)
- **Control de reproducción automática** (on/off)
- **Selección de método de reproducción** (automático, rápido, simple, etc.)
- **Botones de control** (iniciar, detener, ejecutar una vez, limpiar historial)
- **Log de actividad** con códigos de color
- **Lista de audios generados** con reproducción directa

## 🔧 Funcionalidades avanzadas

### Limpieza automática
- Las capturas de pantalla se limpian automáticamente (mantiene las 5 más recientes)
- Los archivos de audio se limpian cada 10 ciclos (mantiene los 10 más recientes)

### Contexto conversacional
- El asistente mantiene contexto de los últimos 5 análisis
- Evita repetir comentarios similares
- Genera preguntas coherentes con la actividad actual

### Manejo de errores
- Continúa funcionando aunque falle Applio (solo análisis sin voz)
- Reintenta automáticamente en caso de errores temporales
- Logs detallados para debugging

## 🚨 Solución de problemas

### Error: "OPENAI_API_KEY no configurada"
```bash
# Asegúrate de que tu .env tiene:
OPENAI_API_KEY=sk-...tu_api_key_real...
```

### Error: "Applio no disponible"
- Verifica que Applio esté ejecutándose en puerto 6969
- El asistente seguirá funcionando sin TTS

### Error de permisos en capturas
```bash
# Ejecuta como administrador en Windows
# O verifica permisos del directorio
```

## 📊 Logs y monitoreo

El asistente muestra logs detallados:

```
🔄 === CICLO 1 - 10:30:25 ===
📸 Capturando pantalla (base64)...
✅ Captura en base64 (250.3 KB)
🧠 Analizando imagen con OpenAI...
✅ Análisis completado
💭 Respuesta: Veo que estás programando en JavaScript...
🔊 Generando audio...
🎬 Iniciando TTS: «Veo que estás programando en JavaScript...»
✅ Guardado: audio\comment-2025-08-25T10-30-28-123Z.wav
🎵 Audio generado: comment-2025-08-25T10-30-28-123Z.wav
✅ Ciclo 1 completado
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📝 Licencia

MIT License - puedes usar este código libremente.

## 💡 Ideas de mejora

- [ ] Interfaz web para controlar el asistente
- [ ] Diferentes tipos de análisis (productividad, ocio, etc.)
- [ ] Integración con más servicios de TTS
- [ ] Detección de cambios significativos en pantalla
- [ ] Modo "no molestar" durante ciertas aplicaciones
- [ ] Análisis de emociones en la pantalla
- [ ] Recordatorios inteligentes basados en actividad
