import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

class AudioPlayer {
    constructor() {
        this.isPlaying = false;
        this.currentProcess = null;
        this.audioQueue = [];
        this.isProcessingQueue = false;
    }

    async playAudio(audioPath) {
        try {
            // Verificar que el archivo existe
            if (!fs.existsSync(audioPath)) {
                throw new Error(`Archivo de audio no encontrado: ${audioPath}`);
            }

            console.log(`🔊 Reproduciendo: ${path.basename(audioPath)}`);

            // En Windows, usar PowerShell para reproducir audio
            const command = 'powershell';
            const args = [
                '-Command',
                `Add-Type -AssemblyName presentationCore; ` +
                `$mediaPlayer = New-Object system.windows.media.mediaplayer; ` +
                `$mediaPlayer.open([uri]"${audioPath.replace(/\\/g, '\\\\')}"); ` +
                `$mediaPlayer.Play(); ` +
                `Start-Sleep -Seconds 1; ` +
                `while($mediaPlayer.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 100 }; ` +
                `$duration = $mediaPlayer.NaturalDuration.TimeSpan.TotalSeconds; ` +
                `Start-Sleep -Seconds $duration; ` +
                `$mediaPlayer.Stop()`
            ];

            return new Promise((resolve, reject) => {
                this.isPlaying = true;
                
                this.currentProcess = spawn(command, args, {
                    windowsHide: true
                });

                this.currentProcess.on('close', (code) => {
                    this.isPlaying = false;
                    this.currentProcess = null;
                    
                    if (code === 0) {
                        console.log('✅ Reproducción completada');
                        resolve({ success: true });
                    } else {
                        console.log('⚠️ Reproducción terminada con código:', code);
                        resolve({ success: false, code });
                    }
                });

                this.currentProcess.on('error', (error) => {
                    this.isPlaying = false;
                    this.currentProcess = null;
                    console.error('❌ Error reproduciendo audio:', error.message);
                    reject(error);
                });

                // Timeout de seguridad (máximo 60 segundos) - pero no cancelar automáticamente
                setTimeout(() => {
                    if (this.isPlaying) {
                        console.log('⏰ Timeout de reproducción alcanzado');
                        // NO cancelar automáticamente - solo registrar
                        console.log('💡 Continuando reproducción (sin límite de tiempo)');
                    }
                }, 60000); // Aumentamos a 60 segundos
            });

        } catch (error) {
            console.error('❌ Error en reproductor de audio:', error.message);
            throw error;
        }
    }

    // Método alternativo usando Windows Media Player (si está disponible)
    async playAudioWMP(audioPath) {
        try {
            console.log(`🔊 Reproduciendo con WMP: ${path.basename(audioPath)}`);

            const command = 'powershell';
            const args = [
                '-Command',
                `$wmp = New-Object -ComObject WMPlayer.OCX; ` +
                `$wmp.openPlayer("${audioPath.replace(/\\/g, '\\\\')}"); ` +
                `while($wmp.playState -ne 1) { Start-Sleep -Milliseconds 100 }`
            ];

            return new Promise((resolve, reject) => {
                this.isPlaying = true;
                
                this.currentProcess = spawn(command, args, {
                    windowsHide: true
                });

                this.currentProcess.on('close', (code) => {
                    this.isPlaying = false;
                    this.currentProcess = null;
                    console.log('✅ Reproducción WMP completada');
                    resolve({ success: true });
                });

                this.currentProcess.on('error', (error) => {
                    this.isPlaying = false;
                    this.currentProcess = null;
                    console.error('❌ Error con WMP:', error.message);
                    // Intentar con el método principal
                    this.playAudio(audioPath).then(resolve).catch(reject);
                });
            });

        } catch (error) {
            console.error('❌ Error en WMP, usando método principal');
            return this.playAudio(audioPath);
        }
    }

    // Método simple usando start (abre con el reproductor predeterminado)
    async playAudioSimple(audioPath) {
        try {
            console.log(`🔊 Abriendo audio: ${path.basename(audioPath)}`);

            const command = 'cmd';
            const args = ['/c', 'start', '""', `"${audioPath}"`];

            return new Promise((resolve, reject) => {
                const process = spawn(command, args, {
                    windowsHide: true,
                    detached: true
                });

                process.on('close', (code) => {
                    console.log('✅ Audio abierto en reproductor predeterminado');
                    resolve({ success: true });
                });

                process.on('error', (error) => {
                    console.error('❌ Error abriendo audio:', error.message);
                    reject(error);
                });

                // No esperamos, solo abrimos
                setTimeout(() => {
                    resolve({ success: true, opened: true });
                }, 1000);
            });

        } catch (error) {
            console.error('❌ Error en reproductor simple:', error.message);
            throw error;
        }
    }

    // Método optimizado para comentarios cortos (usa SoundPlayer)
    async playAudioFast(audioPath) {
        try {
            console.log(`🔊 Reproduciendo (rápido): ${path.basename(audioPath)}`);

            const command = 'powershell';
            const args = [
                '-Command',
                `[System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms"); ` +
                `$player = New-Object System.Media.SoundPlayer; ` +
                `$player.SoundLocation = "${audioPath.replace(/\\/g, '\\\\')}"; ` +
                `$player.PlaySync()`
            ];

            return new Promise((resolve, reject) => {
                this.isPlaying = true;
                
                this.currentProcess = spawn(command, args, {
                    windowsHide: true
                });

                this.currentProcess.on('close', (code) => {
                    this.isPlaying = false;
                    this.currentProcess = null;
                    
                    if (code === 0) {
                        console.log('✅ Reproducción rápida completada');
                        resolve({ success: true });
                    } else {
                        console.log('⚠️ Reproducción terminada con código:', code);
                        resolve({ success: false, code });
                    }
                });

                this.currentProcess.on('error', (error) => {
                    this.isPlaying = false;
                    this.currentProcess = null;
                    console.error('❌ Error en reproducción rápida:', error.message);
                    reject(error);
                });

                // Timeout más corto para comentarios (pero no cancelar automáticamente)
                setTimeout(() => {
                    if (this.isPlaying) {
                        console.log('⏰ Timeout de reproducción rápida alcanzado');
                        // NO cancelar automáticamente - solo registrar
                        console.log('💡 Continuando reproducción (sin límite de tiempo)');
                    }
                }, 30000); // Aumentamos a 30 segundos para dar más tiempo
            });

        } catch (error) {
            console.error('❌ Error en reproductor rápido:', error.message);
            throw error;
        }
    }

    stopAudio(clearQueue = false) {
        if (this.currentProcess && this.isPlaying) {
            console.log('⏹️ Deteniendo reproducción...');
            this.currentProcess.kill();
            this.isPlaying = false;
            this.currentProcess = null;
        }
        
        // Solo limpiar cola si se solicita explícitamente
        if (clearQueue && this.audioQueue.length > 0) {
            const clearedCount = this.clearQueue();
            console.log(`🧹 ${clearedCount} audios pendientes cancelados`);
        }
    }

    getStatus() {
        return {
            isPlaying: this.isPlaying,
            isProcessingQueue: this.isProcessingQueue,
            queueLength: this.audioQueue.length,
            hasProcess: this.currentProcess !== null
        };
    }

    // Método principal que intenta diferentes enfoques con cola
    async play(audioPath, method = 'auto') {
        return new Promise((resolve, reject) => {
            // Agregar a la cola
            this.audioQueue.push({
                audioPath,
                method,
                resolve,
                reject,
                timestamp: new Date()
            });

            console.log(`🎵 Audio agregado a la cola (posición ${this.audioQueue.length})`);
            
            // Procesar cola si no está ya procesándose
            this.processQueue();
        });
    }

    async processQueue() {
        // Evitar procesamiento concurrente
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.audioQueue.length > 0) {
                // Esperar a que termine la reproducción actual
                if (this.isPlaying) {
                    console.log('⏳ Esperando a que termine la reproducción actual...');
                    await this.waitForCurrentPlaybackToFinish();
                }

                // Procesar siguiente audio en la cola
                const audioItem = this.audioQueue.shift();
                if (audioItem) {
                    console.log(`🎵 Reproduciendo desde cola: ${path.basename(audioItem.audioPath)}`);
                    
                    try {
                        const result = await this.playDirectly(audioItem.audioPath, audioItem.method);
                        audioItem.resolve(result);
                    } catch (error) {
                        audioItem.reject(error);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error procesando cola de audio:', error.message);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    async waitForCurrentPlaybackToFinish() {
        return new Promise((resolve) => {
            const checkStatus = () => {
                if (!this.isPlaying) {
                    resolve();
                } else {
                    setTimeout(checkStatus, 100);
                }
            };
            checkStatus();
        });
    }

    // Método directo de reproducción (sin cola)
    async playDirectly(audioPath, method = 'auto') {
        try {
            switch (method) {
                case 'powershell':
                    return await this.playAudio(audioPath);
                case 'wmp':
                    return await this.playAudioWMP(audioPath);
                case 'simple':
                    return await this.playAudioSimple(audioPath);
                case 'fast':
                    return await this.playAudioFast(audioPath);
                case 'auto':
                default:
                    // Intentar método rápido primero para comentarios cortos
                    try {
                        return await this.playAudioFast(audioPath);
                    } catch (error) {
                        console.log('🔄 Fallback a reproductor simple...');
                        return await this.playAudioSimple(audioPath);
                    }
            }
        } catch (error) {
            console.error('❌ Todos los métodos de reproducción fallaron:', error.message);
            throw error;
        }
    }

    // Limpiar cola de audio
    clearQueue() {
        const queueLength = this.audioQueue.length;
        this.audioQueue = [];
        console.log(`🧹 Cola de audio limpiada (${queueLength} audios pendientes)`);
        return queueLength;
    }

    // Obtener estado de la cola
    getQueueStatus() {
        return {
            isPlaying: this.isPlaying,
            isProcessingQueue: this.isProcessingQueue,
            queueLength: this.audioQueue.length,
            hasProcess: this.currentProcess !== null
        };
    }
}

export default AudioPlayer;
