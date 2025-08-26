import dotenv from 'dotenv';
import WebInterface from './web-server.js';
import AsistenteStream from './index.js';

// Cargar variables de entorno
dotenv.config();

console.log('🌐 Iniciando servidor web del Asistente Stream...\n');

// Variables globales
let asistente;
let webInterface;

// Función async para inicializar todo
async function initializeSystem() {
    try {
        // Crear instancia del asistente (SIN iniciarlo automáticamente)
        asistente = new AsistenteStream(false);

        // Crear e inicializar el servidor web
        webInterface = new WebInterface(asistente, process.env.WEB_PORT || 3000);
        
        // Configurar relación bidireccional
        asistente.webInterface = webInterface;
        
        // Iniciar servidor web
        await webInterface.start();

        console.log('✅ Servidor web iniciado');
        console.log('🎮 Usa la interfaz web para controlar el asistente');
        console.log('💡 El asistente NO se ejecuta automáticamente');
        console.log('🖱️ Inicia/detén el asistente desde http://localhost:3000\n');

    } catch (error) {
        console.error('❌ Error inicializando sistema:', error);
        process.exit(1);
    }
}

// Manejo de señales para cerrar limpiamente
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    
    try {
        if (asistente && asistente.isRunning) {
            await asistente.stop();
        }
        
        if (webInterface) {
            await webInterface.stop();
        }
        
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cerrando:', error);
        process.exit(1);
    }
});

// Inicializar sistema
initializeSystem().catch(console.error);
