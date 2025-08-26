import screenshot from 'screenshot-desktop';
import fs from 'fs';
import path from 'path';

class ScreenCapture {
    constructor(screenshotsDir = 'screenshots', monitorIndex = 0) {
        this.screenshotsDir = screenshotsDir;
        this.monitorIndex = monitorIndex; // 0 = todos los monitores, 1 = monitor principal, 2 = segundo monitor, etc.
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }
    }

    // Método para listar monitores disponibles
    async listDisplays() {
        try {
            const displays = await screenshot.listDisplays();
            console.log('🖥️ Monitores disponibles:');
            displays.forEach((display, index) => {
                console.log(`   Monitor ${index + 1}: ${display.width}x${display.height} (ID: ${display.id})`);
            });
            return displays;
        } catch (error) {
            console.error('❌ Error listando monitores:', error.message);
            return [];
        }
    }

    // Método para cambiar el monitor objetivo
    setMonitor(monitorIndex) {
        this.monitorIndex = monitorIndex;
        const monitorText = monitorIndex === 0 ? 'todos los monitores' : `monitor ${monitorIndex}`;
        console.log(`🖥️ Monitor configurado: ${monitorText}`);
    }

    async captureScreen() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `screenshot-${timestamp}.png`;
            const filepath = path.join(this.screenshotsDir, filename);

            const monitorText = this.monitorIndex === 0 ? 'todos los monitores' : `monitor ${this.monitorIndex}`;
            console.log(`📸 Capturando pantalla (${monitorText})...`);
            
            // Configurar opciones de captura
            const options = { format: 'png' };
            if (this.monitorIndex > 0) {
                options.screen = this.monitorIndex - 1; // La librería usa índice base 0
            }
            
            const imgBuffer = await screenshot(options);
            fs.writeFileSync(filepath, imgBuffer);
            
            console.log(`✅ Captura guardada: ${filepath}`);
            
            return {
                success: true,
                filepath,
                filename,
                size: imgBuffer.length,
                monitor: this.monitorIndex
            };
        } catch (error) {
            console.error('❌ Error capturando pantalla:', error.message);
            throw error;
        }
    }

    async captureToBase64() {
        try {
            const monitorText = this.monitorIndex === 0 ? 'todos los monitores' : `monitor ${this.monitorIndex}`;
            console.log(`📸 Capturando pantalla (base64, ${monitorText})...`);
            
            // Configurar opciones de captura
            const options = { format: 'png' };
            if (this.monitorIndex > 0) {
                options.screen = this.monitorIndex - 1; // La librería usa índice base 0
            }
            
            const imgBuffer = await screenshot(options);
            const base64 = imgBuffer.toString('base64');
            
            console.log(`✅ Captura en base64 (${(base64.length / 1024).toFixed(1)} KB)`);
            
            return {
                success: true,
                base64,
                size: imgBuffer.length,
                monitor: this.monitorIndex
            };
        } catch (error) {
            console.error('❌ Error capturando pantalla:', error.message);
            throw error;
        }
    }

    // Limpia capturas antiguas (mantiene solo las últimas N)
    cleanOldScreenshots(keepLast = 10) {
        try {
            const files = fs.readdirSync(this.screenshotsDir)
                .filter(file => file.startsWith('screenshot-') && file.endsWith('.png'))
                .map(file => ({
                    name: file,
                    path: path.join(this.screenshotsDir, file),
                    mtime: fs.statSync(path.join(this.screenshotsDir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length > keepLast) {
                const filesToDelete = files.slice(keepLast);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Eliminado: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('❌ Error limpiando capturas:', error.message);
        }
    }
}

export default ScreenCapture;
