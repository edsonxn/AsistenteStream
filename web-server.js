import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebInterface {
    constructor(asistenteInstance = null) {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.port = process.env.WEB_PORT || 3000;
        this.asistente = asistenteInstance;
        this.connectedClients = 0;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Página principal
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API para obtener configuración actual
        this.app.get('/api/config', (req, res) => {
            const config = this.getCurrentConfig();
            res.json(config);
        });

        // API para actualizar configuración
        this.app.post('/api/config', (req, res) => {
            try {
                const updatedConfig = this.updateConfig(req.body);
                res.json({ success: true, config: updatedConfig });
                
                // Notificar a todos los clientes
                this.io.emit('configUpdated', updatedConfig);
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // API para obtener estado del asistente
        this.app.get('/api/status', (req, res) => {
            const status = this.getAsistenteStatus();
            res.json(status);
        });

        // API para controlar el asistente
        this.app.post('/api/control/:action', (req, res) => {
            try {
                const action = req.params.action;
                const result = this.controlAsistente(action);
                res.json({ success: true, result });
            } catch (error) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // API para obtener archivos de audio recientes
        this.app.get('/api/audio', (req, res) => {
            try {
                const audioFiles = this.getRecentAudioFiles();
                res.json(audioFiles);
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Servir archivos de audio
        this.app.get('/api/audio/:filename', (req, res) => {
            const filename = req.params.filename;
            const audioDir = process.env.AUDIO_DIR || 'audio';
            const filePath = path.join(__dirname, audioDir, filename);
            
            if (fs.existsSync(filePath)) {
                res.sendFile(filePath);
            } else {
                res.status(404).json({ error: 'Archivo no encontrado' });
            }
        });

        // Endpoint para obtener la personalidad actual
        this.app.get('/api/personality', (req, res) => {
            if (!this.asistente?.visionAnalyzer) {
                return res.json({ success: false, error: 'Vision Analyzer no disponible' });
            }
            
            const currentPrompt = this.asistente.visionAnalyzer.getSystemPrompt();
            res.json({ 
                success: true, 
                personality: currentPrompt,
                historyCount: this.asistente.visionAnalyzer.conversationHistory.length
            });
        });

        // Endpoint para actualizar la personalidad
        this.app.post('/api/personality', (req, res) => {
            if (!this.asistente?.visionAnalyzer) {
                return res.json({ success: false, error: 'Vision Analyzer no disponible' });
            }
            
            const { personality } = req.body;
            if (!personality || typeof personality !== 'string') {
                return res.json({ success: false, error: 'Personalidad inválida' });
            }
            
            try {
                // Actualizar la personalidad en el Vision Analyzer
                this.asistente.visionAnalyzer.setCustomPersonality(personality);
                
                // Notificar a todos los clientes conectados
                this.io.emit('personalityUpdate', { personality });
                
                res.json({ success: true, message: 'Personalidad actualizada correctamente' });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });

        // Endpoint para resetear a personalidad por defecto
        this.app.post('/api/personality/reset', (req, res) => {
            if (!this.asistente?.visionAnalyzer) {
                return res.json({ success: false, error: 'Vision Analyzer no disponible' });
            }
            
            try {
                this.asistente.visionAnalyzer.resetPersonality();
                const defaultPersonality = this.asistente.visionAnalyzer.getSystemPrompt();
                
                // Notificar a todos los clientes conectados
                this.io.emit('personalityUpdate', { personality: defaultPersonality });
                
                res.json({ success: true, message: 'Personalidad reseteada a la por defecto', personality: defaultPersonality });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });

        // API para listar monitores disponibles
        this.app.get('/api/monitors', async (req, res) => {
            if (!this.asistente?.screenCapture) {
                return res.json({ success: false, error: 'Screen Capture no disponible' });
            }
            
            try {
                const displays = await this.asistente.screenCapture.listDisplays();
                const currentMonitor = this.asistente.config.monitorIndex;
                
                res.json({ 
                    success: true, 
                    displays: displays,
                    currentMonitor: currentMonitor
                });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });

        // API para cambiar monitor
        this.app.post('/api/monitor', (req, res) => {
            const { monitorIndex } = req.body;
            
            if (!this.asistente?.screenCapture) {
                return res.json({ success: false, error: 'Screen Capture no disponible' });
            }
            
            if (typeof monitorIndex !== 'number' || monitorIndex < 0) {
                return res.json({ success: false, error: 'Índice de monitor inválido' });
            }
            
            try {
                // Actualizar configuración
                this.asistente.config.monitorIndex = monitorIndex;
                this.asistente.screenCapture.setMonitor(monitorIndex);
                
                // Actualizar variable de entorno
                this.updateConfig({ monitorIndex: monitorIndex });
                
                const monitorText = monitorIndex === 0 ? 'todos los monitores' : `monitor ${monitorIndex}`;
                res.json({ 
                    success: true, 
                    message: `Monitor cambiado a: ${monitorText}`,
                    currentMonitor: monitorIndex
                });
            } catch (error) {
                res.json({ success: false, error: error.message });
            }
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            this.connectedClients++;
            console.log(`🌐 Cliente conectado (${this.connectedClients} total)`);

            // Enviar estado inicial
            socket.emit('statusUpdate', this.getAsistenteStatus());
            socket.emit('configUpdate', this.getCurrentConfig());

            socket.on('disconnect', () => {
                this.connectedClients--;
                console.log(`🌐 Cliente desconectado (${this.connectedClients} total)`);
            });

            // Escuchar solicitudes de control
            socket.on('controlAction', (action) => {
                try {
                    const result = this.controlAsistente(action);
                    socket.emit('controlResult', { action, success: true, result });
                } catch (error) {
                    socket.emit('controlResult', { action, success: false, error: error.message });
                }
            });
        });
    }

    getCurrentConfig() {
        return {
            screenshotInterval: parseInt(process.env.SCREENSHOT_INTERVAL) || 30000,
            autoPlay: process.env.AUTO_PLAY !== 'false',
            playbackMethod: process.env.PLAYBACK_METHOD || 'auto',
            ttsModel: process.env.TTS_MODEL || 'fr-FR-RemyMultilingualNeural',
            applioUrl: process.env.APPLIO_URL || 'http://127.0.0.1:6969',
            screenshotsDir: process.env.SCREENSHOTS_DIR || 'screenshots',
            audioDir: process.env.AUDIO_DIR || 'audio',
            webPort: process.env.WEB_PORT || 3000,
            monitorIndex: parseInt(process.env.MONITOR_INDEX) || 1
        };
    }

    updateConfig(newConfig) {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Actualizar variables de entorno
        const updates = {
            SCREENSHOT_INTERVAL: newConfig.screenshotInterval || 30000,
            AUTO_PLAY: newConfig.autoPlay !== false,
            PLAYBACK_METHOD: newConfig.playbackMethod || 'auto',
            TTS_MODEL: newConfig.ttsModel || 'fr-FR-RemyMultilingualNeural',
            WEB_PORT: newConfig.webPort || 3000,
            MONITOR_INDEX: newConfig.monitorIndex || 1
        };

        for (const [key, value] of Object.entries(updates)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (envContent.match(regex)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }

        fs.writeFileSync(envPath, envContent);

        // Actualizar variables de proceso actual
        Object.assign(process.env, updates);

        // Si hay una instancia del asistente, aplicar cambios
        if (this.asistente) {
            this.asistente.updateConfig(updates);
        }

        // Obtener configuración actualizada
        const updatedConfig = this.getCurrentConfig();

        // Emitir evento de actualización de configuración a todos los clientes
        this.io.emit('configUpdate', updatedConfig);

        return updatedConfig;
    }

    getAsistenteStatus() {
        if (!this.asistente) {
            return {
                isRunning: false,
                cycleCount: 0,
                lastCycle: null,
                audioPlayerStatus: { isPlaying: false },
                connectedClients: this.connectedClients
            };
        }

        return {
            isRunning: this.asistente.isRunning,
            cycleCount: this.asistente.cycleCount,
            lastCycle: this.asistente.lastCycleTime || null,
            audioPlayerStatus: this.asistente.audioPlayer?.getStatus() || { isPlaying: false },
            connectedClients: this.connectedClients,
            config: this.asistente.config
        };
    }

    controlAsistente(action) {
        if (!this.asistente) {
            throw new Error('Asistente no inicializado');
        }

        switch (action) {
            case 'start':
                if (!this.asistente.isRunning) {
                    this.asistente.start();
                    // Emitir actualización de estado inmediatamente
                    this.io.emit('statusUpdate', this.getAsistenteStatus());
                    return 'Asistente iniciado';
                }
                return 'Asistente ya está ejecutándose';
            
            case 'stop':
                if (this.asistente.isRunning) {
                    this.asistente.stop();
                    // Emitir actualización de estado inmediatamente
                    this.io.emit('statusUpdate', this.getAsistenteStatus());
                    return 'Asistente detenido';
                }
                return 'Asistente ya está detenido';
            
            case 'runOnce':
                this.asistente.runOnce();
                return 'Ejecutando un ciclo';
            
            case 'clearHistory':
                this.asistente.visionAnalyzer.clearHistory();
                return 'Historial limpiado';
            
            case 'stopAudio':
                this.asistente.audioPlayer?.stopAudio(true); // Limpiar cola al detener manualmente
                return 'Audio detenido y cola limpiada';
            
            case 'clearAudioQueue':
                const clearedCount = this.asistente.audioPlayer?.clearQueue() || 0;
                return `Cola de audio limpiada (${clearedCount} audios pendientes)`;
            
            default:
                throw new Error(`Acción no reconocida: ${action}`);
        }
    }

    getRecentAudioFiles() {
        const audioDir = process.env.AUDIO_DIR || 'audio';
        const audioPath = path.join(__dirname, audioDir);
        
        if (!fs.existsSync(audioPath)) {
            return [];
        }

        const files = fs.readdirSync(audioPath)
            .filter(file => file.endsWith('.wav') && file.startsWith('comment-'))
            .map(file => {
                const filePath = path.join(audioPath, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    created: stats.mtime,
                    url: `/api/audio/${file}`
                };
            })
            .sort((a, b) => b.created - a.created)
            .slice(0, 10); // Últimos 10

        return files;
    }

    // Método para enviar logs en tiempo real
    broadcastLog(level, message, data = {}) {
        this.io.emit('log', {
            timestamp: new Date(),
            level,
            message,
            data
        });
    }

    // Método para notificar nuevo ciclo
    broadcastCycleUpdate(cycleData) {
        this.io.emit('cycleUpdate', {
            timestamp: new Date(),
            ...cycleData
        });
    }

    // Método para notificar nuevo audio
    broadcastNewAudio(audioData) {
        this.io.emit('newAudio', {
            timestamp: new Date(),
            ...audioData
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🌐 Interfaz web iniciada en http://localhost:${this.port}`);
            console.log(`📱 Panel de control disponible`);
        });
    }

    setAsistenteInstance(asistenteInstance) {
        this.asistente = asistenteInstance;
    }
}

export default WebInterface;
