import screenshot from 'screenshot-desktop';
import fs from 'fs';
import path from 'path';

class ScreenCapture {
    constructor(screenshotsDir = 'screenshots') {
        this.screenshotsDir = screenshotsDir;
        this.ensureDirectoryExists();
    }

    ensureDirectoryExists() {
        if (!fs.existsSync(this.screenshotsDir)) {
            fs.mkdirSync(this.screenshotsDir, { recursive: true });
        }
    }

    async captureScreen() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `screenshot-${timestamp}.png`;
            const filepath = path.join(this.screenshotsDir, filename);

            console.log('📸 Capturando pantalla...');
            
            const imgBuffer = await screenshot({ format: 'png' });
            fs.writeFileSync(filepath, imgBuffer);
            
            console.log(`✅ Captura guardada: ${filepath}`);
            
            return {
                success: true,
                filepath,
                filename,
                size: imgBuffer.length
            };
        } catch (error) {
            console.error('❌ Error capturando pantalla:', error.message);
            throw error;
        }
    }

    async captureToBase64() {
        try {
            console.log('📸 Capturando pantalla (base64)...');
            
            const imgBuffer = await screenshot({ format: 'png' });
            const base64 = imgBuffer.toString('base64');
            
            console.log(`✅ Captura en base64 (${(base64.length / 1024).toFixed(1)} KB)`);
            
            return {
                success: true,
                base64,
                size: imgBuffer.length
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
