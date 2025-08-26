import ScreenCapture from './screen-capture.js';
import VisionAnalyzer from './vision-analyzer.js';
import ApplioClient from './applio-client.js';
import AudioPlayer from './audio-player.js';
import WebInterface from './web-server.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
dotenv.config();

class AsistenteStream {
    constructor(autoStart = false) {
        this.config = {
            openaiApiKey: process.env.OPENAI_API_KEY,
            screenshotInterval: parseInt(process.env.SCREENSHOT_INTERVAL) || 30000,
            applioUrl: process.env.APPLIO_URL || 'http://127.0.0.1:6969',
            ttsModel: process.env.TTS_MODEL || 'fr-FR-RemyMultilingualNeural',
            screenshotsDir: process.env.SCREENSHOTS_DIR || 'screenshots',
            audioDir: process.env.AUDIO_DIR || 'audio',
            autoPlay: process.env.AUTO_PLAY !== 'false', // Por defecto true
            playbackMethod: process.env.PLAYBACK_METHOD || 'auto' // auto, powershell, simple, wmp
        };

        this.screenCapture = new ScreenCapture(this.config.screenshotsDir);
        this.visionAnalyzer = new VisionAnalyzer(this.config.openaiApiKey);
        this.applioClient = new ApplioClient(this.config.applioUrl);
        this.audioPlayer = new AudioPlayer();
        
        this.isRunning = false;
        this.intervalId = null;
        this.cycleCount = 0;
        this.lastCycleTime = null;
        this.webInterface = null;
        this.autoStart = autoStart;

        this.ensureDirectories();
    }

    ensureDirectories() {
        [this.config.screenshotsDir, this.config.audioDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Directorio creado: ${dir}`);
            }
        });
    }

    async validateConfiguration() {
        console.log('🔍 Validando configuración...');

        // Verificar API key de OpenAI
        if (!this.config.openaiApiKey || this.config.openaiApiKey === 'tu_api_key_aqui') {
            throw new Error('❌ OPENAI_API_KEY no configurada. Revisa tu archivo .env');
        }

        // Verificar conexión con Applio
        const applioConnected = await this.applioClient.checkConnection();
        if (!applioConnected) {
            console.warn('⚠️ Applio no está disponible. El TTS no funcionará.');
        }

        console.log('✅ Configuración validada');
        return { applioConnected };
    }

    async processCycle() {
        try {
            this.cycleCount++;
            this.lastCycleTime = new Date();
            const timestamp = this.lastCycleTime.toLocaleTimeString();
            
            console.log(`\n🔄 === CICLO ${this.cycleCount} - ${timestamp} ===`);
            
            // Notificar a la interfaz web
            this.webInterface?.broadcastLog('info', `Iniciando ciclo ${this.cycleCount}`);

            // 1. Capturar pantalla
            const capture = await this.screenCapture.captureToBase64();
            this.webInterface?.broadcastLog('success', `Captura realizada: ${(capture.size / 1024).toFixed(1)} KB`);
            
            // 2. Analizar con OpenAI
            const analysis = await this.visionAnalyzer.analyzeScreenshot(capture.base64);
            this.webInterface?.broadcastLog('success', `Análisis completado: "${analysis.analysis?.substring(0, 100)}..."`);
            
            // 3. Convertir a voz y reproducir
            if (analysis.success) {
                const audioResult = await this.generateAndPlayVoiceComment(analysis.analysis);
                if (audioResult) {
                    this.webInterface?.broadcastNewAudio({
                        filename: path.basename(audioResult.filePath),
                        size: audioResult.size
                    });
                }
            }

            // 4. Limpiar archivos antiguos cada 10 ciclos
            if (this.cycleCount % 10 === 0) {
                this.screenCapture.cleanOldScreenshots(5);
                this.cleanOldAudioFiles(10);
                this.webInterface?.broadcastLog('info', 'Archivos antiguos limpiados');
            }

            // Notificar ciclo completado
            this.webInterface?.broadcastCycleUpdate({
                cycleCount: this.cycleCount,
                lastCycle: this.lastCycleTime
            });

            console.log(`✅ Ciclo ${this.cycleCount} completado\n`);

        } catch (error) {
            console.error(`❌ Error en ciclo ${this.cycleCount}:`, error.message);
            this.webInterface?.broadcastLog('error', `Error en ciclo ${this.cycleCount}: ${error.message}`);
        }
    }

    async generateAndPlayVoiceComment(text) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const audioFilename = `comment-${timestamp}.wav`;
            const audioPath = path.join(this.config.audioDir, audioFilename);

            console.log('🔊 Generando audio...');

            const result = await this.applioClient.textToSpeech(text, audioPath, {
                model: this.config.ttsModel,
                speed: 0,
                pitch: 0
            });

            if (result.success) {
                console.log(`🎵 Audio generado: ${audioFilename}`);
                
                // Reproducir automáticamente si está habilitado
                if (this.config.autoPlay) {
                    console.log('🎶 Iniciando reproducción automática...');
                    this.webInterface?.broadcastLog('info', `Reproducción automática (cola: ${this.audioPlayer.getStatus().queueLength})`);
                    try {
                        await this.audioPlayer.play(audioPath, this.config.playbackMethod);
                        console.log('🎵 ¡Reproducción completada!');
                        this.webInterface?.broadcastLog('success', 'Reproducción completada');
                    } catch (playError) {
                        console.warn('⚠️ Error reproduciendo audio:', playError.message);
                        this.webInterface?.broadcastLog('warning', `Error reproduciendo audio: ${playError.message}`);
                        console.log('💡 El audio se guardó correctamente en:', audioPath);
                    }
                } else {
                    console.log('🔇 Reproducción automática deshabilitada');
                    this.webInterface?.broadcastLog('info', 'Reproducción automática deshabilitada');
                    console.log('💡 Audio guardado en:', audioPath);
                }
                
                return result;
            }

        } catch (error) {
            console.error('❌ Error generando voz:', error.message);
        }
    }

    cleanOldAudioFiles(keepLast = 10) {
        try {
            const files = fs.readdirSync(this.config.audioDir)
                .filter(file => file.startsWith('comment-') && file.endsWith('.wav'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.audioDir, file),
                    mtime: fs.statSync(path.join(this.config.audioDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length > keepLast) {
                const filesToDelete = files.slice(keepLast);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Audio eliminado: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('❌ Error limpiando audios:', error.message);
        }
    }

    async start() {
        try {
            if (this.isRunning) {
                console.log('⚠️ El asistente ya está ejecutándose');
                return;
            }

            console.log('🚀 Iniciando Asistente Stream...\n');
            this.webInterface?.broadcastLog('info', 'Iniciando Asistente Stream...');

            // Validar configuración
            const validation = await this.validateConfiguration();

            if (!validation.applioConnected) {
                console.log('ℹ️ Continuando sin TTS (solo análisis de imagen)');
                this.webInterface?.broadcastLog('warning', 'Continuando sin TTS');
            }

            // Mostrar configuración
            console.log('⚙️ Configuración:');
            console.log(`   📊 Intervalo: ${this.config.screenshotInterval / 1000}s`);
            console.log(`   🗂️ Capturas: ${this.config.screenshotsDir}`);
            console.log(`   🔊 Audio: ${this.config.audioDir}`);
            console.log(`   🎛️ Modelo TTS: ${this.config.ttsModel}`);
            console.log(`   🎵 Auto-reproducir: ${this.config.autoPlay ? 'Sí' : 'No'}`);
            console.log(`   🎮 Método reproducción: ${this.config.playbackMethod}`);
            
            console.log('');

            // Marcar como ejecutándose ANTES del primer ciclo
            this.isRunning = true;

            // Ejecutar primer ciclo inmediatamente
            await this.processCycle();

            // Programar ciclos siguientes
            this.intervalId = setInterval(() => {
                if (this.isRunning) {
                    this.processCycle();
                }
            }, this.config.screenshotInterval);

            console.log('✅ Asistente Stream en funcionamiento');
            console.log('💡 Presiona Ctrl+C para detener\n');
            this.webInterface?.broadcastLog('success', 'Asistente Stream iniciado correctamente');

        } catch (error) {
            console.error('❌ Error iniciando:', error.message);
            this.webInterface?.broadcastLog('error', `Error iniciando: ${error.message}`);
            throw error;
        }
    }

    stop() {
        console.log('\n🛑 Deteniendo Asistente Stream...');
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // Detener reproducción de audio si está en curso
        if (this.audioPlayer) {
            this.audioPlayer.stopAudio(true); // Limpiar cola al detener el asistente
        }
        
        console.log('✅ Asistente detenido');
        console.log(`📊 Total de ciclos ejecutados: ${this.cycleCount}`);
        this.webInterface?.broadcastLog('info', 'Asistente detenido');
    }

    // Método para actualizar configuración dinámicamente
    updateConfig(newConfig) {
        // Actualizar configuración interna
        Object.assign(this.config, newConfig);
        
        // Reiniciar intervalo si está ejecutándose y cambió el intervalo
        if (this.isRunning && newConfig.SCREENSHOT_INTERVAL) {
            this.config.screenshotInterval = parseInt(newConfig.SCREENSHOT_INTERVAL);
            
            // Reiniciar intervalo
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = setInterval(() => {
                    if (this.isRunning) {
                        this.processCycle();
                    }
                }, this.config.screenshotInterval);
            }
            
            console.log(`⚙️ Intervalo actualizado a ${this.config.screenshotInterval / 1000}s`);
            this.webInterface?.broadcastLog('info', `Intervalo actualizado a ${this.config.screenshotInterval / 1000}s`);
        }
        
        // Actualizar otras configuraciones
        if (newConfig.AUTO_PLAY !== undefined) {
            this.config.autoPlay = newConfig.AUTO_PLAY !== 'false';
        }
        
        if (newConfig.PLAYBACK_METHOD) {
            this.config.playbackMethod = newConfig.PLAYBACK_METHOD;
        }
    }

    // Método para configurar la interfaz web
    setupWebInterface() {
        this.webInterface = new WebInterface(this);
        this.webInterface.start();
        return this.webInterface;
    }

    // Método para ejecutar un solo ciclo (útil para testing)
    async runOnce() {
        console.log('🔄 Ejecutando un solo ciclo...\n');
        await this.validateConfiguration();
        await this.processCycle();
        console.log('✅ Ciclo único completado');
    }
}

// Manejo de señales para cierre limpio
const asistente = new AsistenteStream(true); // autoStart = true para ejecución directa

process.on('SIGINT', () => {
    asistente.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    asistente.stop();
    process.exit(0);
});

// Solo ejecutar si este archivo se ejecuta directamente
const isMainModule = process.argv[1] && process.argv[1].includes('index.js');

if (isMainModule) {
    // Verificar argumentos de línea de comandos
    const args = process.argv.slice(2);
    
    if (args.includes('--once') || args.includes('-o')) {
        // Ejecutar solo una vez
        asistente.runOnce().then(() => {
            process.exit(0);
        }).catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
    } else {
        // Ejecutar continuamente
        asistente.start();
    }
}

export default AsistenteStream;
