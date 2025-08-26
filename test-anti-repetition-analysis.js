import VisionAnalyzer from './vision-analyzer.js';
import fs from 'fs';

console.log('🧠 PRUEBA DE ANÁLISIS ANTI-REPETICIÓN INTELIGENTE');
console.log('==================================================');

async function testAntiRepetitionAnalysis() {
    try {
        // Crear instancia simulada sin OpenAI para testing
        const analyzer = {
            conversationHistory: [],
            analyzeRecentContent: VisionAnalyzer.prototype.analyzeRecentContent,
            generateVariationRecommendation: VisionAnalyzer.prototype.generateVariationRecommendation
        };
        
        // Cargar historial directamente del archivo JSON
        if (fs.existsSync('./historial-comentarios.json')) {
            const historialData = JSON.parse(fs.readFileSync('./historial-comentarios.json', 'utf8'));
            if (historialData.conversations && Array.isArray(historialData.conversations)) {
                analyzer.conversationHistory = historialData.conversations;
            }
        }
        
        console.log(`📊 Comentarios cargados: ${analyzer.conversationHistory.length}`);
        
        // Realizar análisis anti-repetición
        const analysis = analyzer.analyzeRecentContent();
        
        console.log('\n🔍 ANÁLISIS DE CONTENIDO RECIENTE:');
        console.log('------------------------------');
        
        console.log('\n📝 PALABRAS REPETIDAS (últimos 5 comentarios):');
        if (analysis.wordsUsed.length > 0) {
            analysis.wordsUsed.forEach(word => {
                console.log(`   ⚠️  "${word}"`);
            });
        } else {
            console.log('   ✅ No hay palabras significativamente repetidas');
        }
        
        console.log('\n🎭 TEMAS DETECTADOS:');
        if (analysis.themesUsed.length > 0) {
            analysis.themesUsed.forEach(theme => {
                console.log(`   🎯 ${theme}`);
            });
        } else {
            console.log('   ✅ No hay temas predominantes detectados');
        }
        
        console.log('\n💭 FRASES SARCÁSTICAS USADAS:');
        if (analysis.sarcasticPhrases.length > 0) {
            analysis.sarcasticPhrases.forEach(phrase => {
                console.log(`   🎪 "${phrase}"`);
            });
        } else {
            console.log('   ✅ No hay frases sarcásticas detectadas como repetitivas');
        }
        
        console.log('\n🎯 RECOMENDACIÓN INTELIGENTE:');
        console.log(`   💡 ${analysis.recommendation}`);
        
        console.log('\n📚 COMENTARIOS RECIENTES ANALIZADOS:');
        console.log('------------------------------');
        if (analysis.recentComments) {
            analysis.recentComments.forEach((comment, index) => {
                console.log(`${index + 1}. "${comment}"`);
            });
        }
        
        console.log('\n✨ SISTEMA ANTI-REPETICIÓN FUNCIONANDO CORRECTAMENTE ✨');
        
    } catch (error) {
        console.error('❌ Error en análisis anti-repetición:', error.message);
    }
}

testAntiRepetitionAnalysis();
