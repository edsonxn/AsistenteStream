// Test para verificar las conexiones narrativas del AsistenteStream
import fs from 'fs';

// Cargar el historial actual
const historyFile = './historial-comentarios.json';
const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

console.log('📚 ANÁLISIS DEL HISTORIAL NARRATIVO');
console.log('=' .repeat(50));

console.log(`📊 Total de comentarios: ${historyData.conversations.length}`);
console.log('');

// Mostrar últimos 3 comentarios para ver conexiones
const last3 = historyData.conversations.slice(-3);

console.log('🔍 ÚLTIMOS 3 COMENTARIOS:');
console.log('-' .repeat(30));

last3.forEach((comment, index) => {
    const timestamp = new Date(comment.timestamp).toLocaleTimeString();
    console.log(`\n${index + 1}. [${timestamp}]`);
    console.log(`📝 "${comment.analysis}"`);
    console.log(`📐 ${comment.analysis.length} caracteres`);
});

console.log('\n' + '=' .repeat(50));
console.log('🔍 ANÁLISIS DE CONEXIONES:');

// Buscar palabras de conexión temporal
const connectionWords = ['después', 'tras', 'recordando', 'continuando', 'como si', 'vaya', 'de'];
const recentComments = last3.map(c => c.analysis.toLowerCase());

recentComments.forEach((comment, index) => {
    console.log(`\n${index + 1}. PALABRAS DE CONEXIÓN ENCONTRADAS:`);
    const found = connectionWords.filter(word => comment.includes(word));
    if (found.length > 0) {
        console.log(`   ✅ ${found.join(', ')}`);
    } else {
        console.log(`   ❌ Ninguna palabra de conexión clara`);
    }
});

// Buscar referencias específicas entre comentarios
console.log('\n🔗 REFERENCIAS ENTRE COMENTARIOS:');
if (last3.length >= 2) {
    const penultimate = last3[last3.length - 2].analysis.toLowerCase();
    const ultimate = last3[last3.length - 1].analysis.toLowerCase();
    
    // Extraer palabras clave del penúltimo
    const keywords = penultimate.split(' ').filter(word => word.length > 5);
    const references = keywords.filter(word => ultimate.includes(word));
    
    if (references.length > 0) {
        console.log(`✅ Referencias encontradas: ${references.join(', ')}`);
    } else {
        console.log(`❌ No se encontraron referencias claras entre los últimos 2 comentarios`);
    }
}

console.log('\n📋 EVALUACIÓN DEL SISTEMA:');
const hasConnections = recentComments.some(comment => 
    connectionWords.some(word => comment.includes(word))
);

if (hasConnections) {
    console.log('✅ El sistema está usando palabras de conexión');
} else {
    console.log('⚠️ El sistema necesita mejorar las conexiones narrativas');
}

console.log('\n💡 PRÓXIMOS COMENTARIOS DEBERÍAN INCLUIR:');
console.log('- "Después de [X], ahora..."');
console.log('- "Tras ver [Y], llegamos a..."');
console.log('- "Recordando [Z], esto es..."');
console.log('- "Como continuación de [W]..."');
