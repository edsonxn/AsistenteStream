// Test para verificar que se evitan frases repetitivas de conexión
import fs from 'fs';

// Frases repetitivas que debemos evitar
const frasesRepetitivas = [
    'después de',
    'tras ver',
    'recordando',
    'como si',
    'continuando',
    'siguiendo',
    'tras esa'
];

// Cargar el historial actual
const historyFile = './historial-comentarios.json';
const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

console.log('🚫 VERIFICACIÓN DE FRASES REPETITIVAS');
console.log('=' .repeat(50));

// Mostrar últimos 5 comentarios
const last5 = historyData.conversations.slice(-5);

console.log('🔍 ÚLTIMOS 5 COMENTARIOS:');
console.log('-' .repeat(30));

let comentariosConFrases = 0;
let totalComentarios = 0;

last5.forEach((comment, index) => {
    const timestamp = new Date(comment.timestamp).toLocaleTimeString();
    const texto = comment.analysis.toLowerCase();
    
    // Buscar frases repetitivas
    const frasesEncontradas = frasesRepetitivas.filter(frase => texto.includes(frase));
    const tienefrases = frasesEncontradas.length > 0;
    
    console.log(`\n${index + 1}. [${timestamp}] - ${tienefrases ? '❌' : '✅'}`);
    console.log(`📝 "${comment.analysis}"`);
    
    if (tienefrases) {
        console.log(`🚫 Frases repetitivas encontradas: ${frasesEncontradas.join(', ')}`);
        comentariosConFrases++;
    }
    
    totalComentarios++;
});

console.log('\n' + '=' .repeat(50));
console.log('📈 ESTADÍSTICAS:');
console.log(`❌ Comentarios con frases repetitivas: ${comentariosConFrases}/${totalComentarios}`);
console.log(`✅ Comentarios sin frases repetitivas: ${totalComentarios - comentariosConFrases}/${totalComentarios}`);
console.log(`📊 Porcentaje de éxito: ${(((totalComentarios - comentariosConFrases)/totalComentarios) * 100).toFixed(1)}%`);

if (comentariosConFrases === 0) {
    console.log('🎉 ¡PERFECTO! Ningún comentario usa frases repetitivas');
} else {
    console.log('⚠️ Algunos comentarios aún usan frases repetitivas');
}

console.log('\n🎯 OBJETIVO: 0% de frases repetitivas manteniendo la memoria contextual');
console.log('\n🚫 FRASES A EVITAR:');
frasesRepetitivas.forEach(frase => {
    console.log(`   - "${frase}"`);
});

console.log('\n✅ ALTERNATIVAS SUTILES:');
console.log('   - Referencias naturales a elementos anteriores');
console.log('   - Comparaciones irónicas sin transiciones obvias');
console.log('   - Continuidad temática implícita');
console.log('   - Sarcasmo evolutivo contextual');
