import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { fileURLToPath } from 'url';
import os from 'os';
import record from 'node-record-lpcm16';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

class MicListener {
    constructor(options = {}) {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.isListening = false;
        this.recording = null;
        this.audioBuffer = [];
        this.transcriptionHistory = [];
        this.maxHistoryWords = options.maxHistoryWords || 50;
        this.recordingDuration = options.recordingDuration || 10000; // 10 segundos
        this.silenceThreshold = options.silenceThreshold || 0.01;
        this.tempDir = path.join(os.tmpdir(), 'asistente-stream-audio');
        
        // Crear directorio temporal
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        
        console.log('🎤 MicListener inicializado');
        console.log(`📂 Directorio temporal: ${this.tempDir}`);
        console.log(`📝 Máximo de palabras en historial: ${this.maxHistoryWords}`);
    }

    /**
     * Transcribe audio usando OpenAI Whisper
     */
    async transcribeAudio(audioPath) {
        try {
            if (!fs.existsSync(audioPath)) {
                throw new Error(`Archivo de audio no encontrado: ${audioPath}`);
            }

            const stats = fs.statSync(audioPath);
            if (stats.size === 0) {
                console.log('⚠️ Archivo de audio vacío, saltando transcripción');
                return '';
            }

            console.log(`🎙️ Transcribiendo audio (${(stats.size / 1024).toFixed(1)} KB)...`);

            const formData = new FormData();
            formData.append("file", fs.createReadStream(audioPath));
            formData.append("model", "whisper-1");
            formData.append("language", "es");
            formData.append("response_format", "text");

            const response = await axios.post(
                "https://api.openai.com/v1/audio/transcriptions",
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        "Authorization": `Bearer ${this.openaiApiKey}`
                    },
                    timeout: 30000
                }
            );

            const transcription = response.data.trim();
            
            if (transcription && transcription.length > 3) {
                console.log(`📝 Transcripción: "${transcription}"`);
                return transcription;
            } else {
                console.log('🔇 Audio sin contenido de voz detectado');
                return '';
            }

        } catch (error) {
            console.error('❌ Error en transcripción:', error.message);
            return '';
        }
    }

    /**
     * Convierte archivo WAV a formato compatible con Whisper
     */
    async convertToWhisperFormat(inputPath) {
        const outputPath = inputPath.replace('.wav', '-whisper.wav');
        
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioFrequency(16000)
                .audioChannels(1)
                .audioCodec('pcm_s16le')
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', reject)
                .run();
        });
    }

    /**
     * Agrega nueva transcripción al historial manteniendo límite de palabras
     */
    addToHistory(transcription) {
        if (!transcription || transcription.length < 3) return;

        // Agregar timestamp
        const entry = {
            timestamp: new Date(),
            text: transcription,
            words: transcription.split(' ').length
        };

        this.transcriptionHistory.push(entry);

        // Mantener solo las últimas N palabras
        let totalWords = 0;
        const validEntries = [];

        for (let i = this.transcriptionHistory.length - 1; i >= 0; i--) {
            const entry = this.transcriptionHistory[i];
            if (totalWords + entry.words <= this.maxHistoryWords) {
                validEntries.unshift(entry);
                totalWords += entry.words;
            } else {
                break;
            }
        }

        this.transcriptionHistory = validEntries;
        
        console.log(`📚 Historial actualizado: ${totalWords} palabras en ${validEntries.length} fragmentos`);
    }

    /**
     * Obtiene el contexto actual del streamer (últimas palabras)
     */
    getStreamerContext() {
        if (this.transcriptionHistory.length === 0) {
            return '';
        }

        const contextText = this.transcriptionHistory
            .map(entry => entry.text)
            .join(' ');

        return contextText.trim();
    }

    /**
     * Obtiene estadísticas del contexto actual
     */
    getContextStats() {
        const context = this.getStreamerContext();
        const words = context ? context.split(' ').length : 0;
        
        return {
            totalWords: words,
            totalFragments: this.transcriptionHistory.length,
            lastUpdate: this.transcriptionHistory.length > 0 
                ? this.transcriptionHistory[this.transcriptionHistory.length - 1].timestamp 
                : null,
            contextText: context
        };
    }

    /**
     * Graba audio por segmentos y transcribe
     */
    async recordAndTranscribe() {
        if (!this.isListening) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const audioPath = path.join(this.tempDir, `mic-${timestamp}.wav`);

        try {
            console.log(`🎙️ Grabando ${this.recordingDuration / 1000}s de audio...`);

            // Grabar audio
            await new Promise((resolve, reject) => {
                const recording = record.record({
                    sampleRate: 16000,
                    channels: 1,
                    audioType: 'wav',
                    silence: '2.0',
                    thresholdStart: 0.1,
                    thresholdStop: 0.05
                });

                const fileStream = fs.createWriteStream(audioPath);
                recording.stream().pipe(fileStream);

                // Detener grabación después del tiempo configurado
                setTimeout(() => {
                    recording.stop();
                }, this.recordingDuration);

                recording.stream().on('end', resolve);
                recording.stream().on('error', reject);
            });

            // Verificar si el archivo se creó y tiene contenido
            if (fs.existsSync(audioPath)) {
                const stats = fs.statSync(audioPath);
                if (stats.size > 1000) { // Al menos 1KB
                    // Transcribir
                    const transcription = await this.transcribeAudio(audioPath);
                    
                    if (transcription) {
                        this.addToHistory(transcription);
                    }
                }

                // Limpiar archivo temporal
                fs.unlinkSync(audioPath);
            }

        } catch (error) {
            console.error('❌ Error en grabación/transcripción:', error.message);
            
            // Limpiar archivo temporal en caso de error
            if (fs.existsSync(audioPath)) {
                try {
                    fs.unlinkSync(audioPath);
                } catch (e) {
                    // Ignorar errores de limpieza
                }
            }
        }

        // Programar siguiente grabación si seguimos escuchando
        if (this.isListening) {
            setTimeout(() => this.recordAndTranscribe(), 1000); // 1 segundo entre grabaciones
        }
    }

    /**
     * Inicia la escucha continua del micrófono
     */
    async startListening() {
        if (this.isListening) {
            console.log('⚠️ Ya está escuchando el micrófono');
            return;
        }

        if (!this.openaiApiKey) {
            throw new Error('OPENAI_API_KEY no configurada para transcripción');
        }

        console.log('🎤 Iniciando escucha continua del micrófono...');
        console.log(`⏱️ Segmentos de ${this.recordingDuration / 1000}s`);
        console.log(`📝 Manteniendo últimas ${this.maxHistoryWords} palabras`);

        this.isListening = true;
        this.recordAndTranscribe();
    }

    /**
     * Detiene la escucha del micrófono
     */
    stopListening() {
        if (!this.isListening) {
            console.log('⚠️ No está escuchando actualmente');
            return;
        }

        console.log('🛑 Deteniendo escucha del micrófono...');
        this.isListening = false;

        // Limpiar archivos temporales
        this.cleanupTempFiles();
    }

    /**
     * Limpia archivos temporales
     */
    cleanupTempFiles() {
        try {
            if (fs.existsSync(this.tempDir)) {
                const files = fs.readdirSync(this.tempDir);
                files.forEach(file => {
                    const filePath = path.join(this.tempDir, file);
                    fs.unlinkSync(filePath);
                });
                console.log(`🧹 Limpieza de archivos temporales completada`);
            }
        } catch (error) {
            console.warn('⚠️ Error al limpiar archivos temporales:', error.message);
        }
    }

    /**
     * Limpia el historial de transcripciones
     */
    clearHistory() {
        this.transcriptionHistory = [];
        console.log('🧹 Historial de transcripciones limpiado');
    }

    /**
     * Obtiene estado actual del listener
     */
    getStatus() {
        const stats = this.getContextStats();
        return {
            isListening: this.isListening,
            hasContext: stats.totalWords > 0,
            ...stats
        };
    }
}

export default MicListener;
