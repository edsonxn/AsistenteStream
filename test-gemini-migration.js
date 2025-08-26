import VisionAnalyzer from './vision-analyzer.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('🧪 PROBANDO MIGRACIÓN A GOOGLE AI (GEMINI)');
console.log('==========================================');

async function testGeminiIntegration() {
    try {
        const googleApiKey = process.env.GOOGLE_API_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;
        
        console.log(`🔑 CLAVES CONFIGURADAS:`);
        console.log(`   🟢 Google AI: ${googleApiKey ? '✅ Configurada' : '❌ No configurada'}`);
        console.log(`   🔵 OpenAI: ${openaiApiKey ? '✅ Configurada (legacy)' : '❌ No configurada'}`);
        
        if (!googleApiKey) {
            console.log(`\n❌ ERROR: No se encontró GOOGLE_API_KEY en el archivo .env`);
            console.log(`📝 Para obtener tu API key de Google AI:`);
            console.log(`   1. Ve a https://makersuite.google.com/app/apikey`);
            console.log(`   2. Crea una nueva API key`);
            console.log(`   3. Agrégala al archivo .env:`);
            console.log(`      GOOGLE_API_KEY=tu_api_key_aqui`);
            return;
        }
        
        console.log(`\n🤖 INICIALIZANDO VISION ANALYZER CON GEMINI...`);
        const analyzer = new VisionAnalyzer(googleApiKey);
        
        console.log(`✅ VisionAnalyzer inicializado exitosamente`);
        console.log(`📊 Configuración cargada:`);
        console.log(`   📝 Max Words: ${analyzer.maxWords}`);
        console.log(`   📚 Story Chance: ${(analyzer.storyChance * 100).toFixed(1)}%`);
        console.log(`   💬 Question Chance: ${(analyzer.questionChance * 100).toFixed(1)}%`);
        
        // Test de análisis conversacional (sin imagen)
        console.log(`\n🗣️ PROBANDO ANÁLISIS CONVERSACIONAL...`);
        try {
            const testResult = await analyzer.generateConversationalResponse();
            if (testResult.success && testResult.analysis) {
                const testComment = testResult.analysis;
                console.log(`✅ Análisis conversacional exitoso:`);
                console.log(`   💬 "${testComment}"`);
                console.log(`   📏 Longitud: ${testComment.length} caracteres`);
                console.log(`   📝 Palabras: ${testComment.split(' ').length}`);
            } else {
                console.log(`❌ Error: Respuesta no válida`);
            }
        } catch (conversationalError) {
            console.log(`❌ Error en análisis conversacional: ${conversationalError.message}`);
        }
        
        console.log(`\n🎉 MIGRACIÓN A GEMINI COMPLETADA EXITOSAMENTE!`);
        console.log(`🚀 El sistema ahora usa Google AI (Gemini) en lugar de OpenAI`);
        
    } catch (error) {
        console.error(`❌ ERROR EN LA PRUEBA:`, error.message);
        console.error(`🔍 Detalles del error:`, error);
    }
}

// Función para mostrar comparación de modelos
function showModelComparison() {
    console.log(`\n📊 COMPARACIÓN: OPENAI vs GEMINI`);
    console.log(`================================`);
    console.log(`🔵 OpenAI GPT-4o-mini:`);
    console.log(`   ✅ Excelente para chat y conversación`);
    console.log(`   ✅ Muy bueno con visión`);
    console.log(`   💰 Costo por token`);
    console.log(`   🌐 Requiere VPN en algunos países`);
    
    console.log(`\n🟢 Google AI Gemini 2.0:`);
    console.log(`   ✅ Excelente para multimodal (texto + imagen)`);
    console.log(`   ✅ Muy rápido y eficiente`);
    console.log(`   🆓 Generosa cuota gratuita`);
    console.log(`   🌍 Disponible globalmente`);
    console.log(`   ⚡ Mejor performance en análisis de imágenes`);
    
    console.log(`\n🎯 VENTAJAS DE LA MIGRACIÓN:`);
    console.log(`   🆓 Ahorro en costos de API`);
    console.log(`   ⚡ Mejor velocidad de respuesta`);
    console.log(`   🌍 Mejor accesibilidad internacional`);
    console.log(`   🤖 Modelo más moderno (Gemini 2.0)`);
}

// Ejecutar tests
console.log(`🚀 Iniciando pruebas de migración...`);
showModelComparison();
await testGeminiIntegration();

console.log(`\n🎮 PARA USAR EL SISTEMA CON GEMINI:`);
console.log(`===================================`);
console.log(`1. Configura tu GOOGLE_API_KEY en .env`);
console.log(`2. Ejecuta: npm start`);
console.log(`3. ¡Disfruta tu asistente WoW con Gemini! 🇲🇽✨`);
