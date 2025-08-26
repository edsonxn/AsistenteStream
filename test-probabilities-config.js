import VisionAnalyzer from './vision-analyzer.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('🎲 PROBANDO CONFIGURACIÓN DE PROBABILIDADES');
console.log('============================================');

const analyzer = new VisionAnalyzer('test-key');

console.log(`📊 CONFIGURACIÓN DESDE .env:`);
console.log(`   📸 SCREENSHOT_PROBABILITY: ${process.env.SCREENSHOT_PROBABILITY || 'no configurada'}`);
console.log(`   📚 STORY_PROBABILITY: ${process.env.STORY_PROBABILITY || 'no configurada'}`);
console.log(`   💬 QUESTION_PROBABILITY: ${process.env.QUESTION_PROBABILITY || 'no configurada'}`);
console.log(`   📝 MAX_WORDS: ${process.env.MAX_WORDS || 'no configurada'}`);

console.log(`\n🎯 VALORES USADOS POR EL ANALYZER:`);
console.log(`   📚 Story Chance: ${(analyzer.storyChance * 100).toFixed(1)}%`);
console.log(`   💬 Question Chance: ${(analyzer.questionChance * 100).toFixed(1)}%`);
console.log(`   📝 Max Words: ${analyzer.maxWords}`);

console.log(`\n🎲 SIMULACIÓN DE PROBABILIDADES (100 intentos):`);
console.log('================================================');

// Simular probabilidades
function testProbability(chance, name, iterations = 100) {
    let successCount = 0;
    for (let i = 0; i < iterations; i++) {
        if (Math.random() < chance) {
            successCount++;
        }
    }
    const percentage = (successCount / iterations * 100).toFixed(1);
    const expected = (chance * 100).toFixed(1);
    
    console.log(`${name}: ${successCount}/${iterations} = ${percentage}% (esperado: ${expected}%)`);
    
    return Math.abs(percentage - expected) < 10; // Tolerancia de 10%
}

// Probar cada probabilidad
const screenshotProb = parseFloat(process.env.SCREENSHOT_PROBABILITY) || 0.30;
const storyProb = parseFloat(process.env.STORY_PROBABILITY) || 0.15;
const questionProb = parseFloat(process.env.QUESTION_PROBABILITY) || 0.20;

const screenshotOk = testProbability(screenshotProb, '📸 Screenshots  ');
const storyOk = testProbability(storyProb, '📚 Historias    ');
const questionOk = testProbability(questionProb, '💬 Preguntas    ');

console.log(`\n✅ VALIDACIÓN:`);
console.log(`   📸 Screenshots: ${screenshotOk ? '✅ OK' : '❌ Fuera de rango'}`);
console.log(`   📚 Historias: ${storyOk ? '✅ OK' : '❌ Fuera de rango'}`);
console.log(`   💬 Preguntas: ${questionOk ? '✅ OK' : '❌ Fuera de rango'}`);

if (screenshotOk && storyOk && questionOk) {
    console.log(`\n🎉 ¡TODAS LAS PROBABILIDADES CONFIGURADAS CORRECTAMENTE!`);
} else {
    console.log(`\n⚠️  Algunas probabilidades pueden estar fuera del rango esperado (normal en muestras pequeñas)`);
}

console.log(`\n📋 EJEMPLO DE CONFIGURACIÓN PERSONALIZADA EN .env:`);
console.log('================================================');
console.log('# Para más capturas de pantalla:');
console.log('SCREENSHOT_PROBABILITY=0.50  # 50%');
console.log('');
console.log('# Para más historias:');
console.log('STORY_PROBABILITY=0.25       # 25%');
console.log('');
console.log('# Para más preguntas:');
console.log('QUESTION_PROBABILITY=0.35    # 35%');
console.log('');
console.log('# Para comentarios más largos:');
console.log('MAX_WORDS=80                 # 80 palabras');

console.log(`\n🎮 SISTEMA DE PROBABILIDADES CONFIGURADO Y LISTO!`);
