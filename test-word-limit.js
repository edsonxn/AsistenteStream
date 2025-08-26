// Test para verificar el límite de 20 palabras en comentarios
import fs from 'fs';

// Función para contar palabras
function contarPalabras(texto) {
    return texto.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Cargar el historial actual
const historyFile = './historial-comentarios.json';
const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));

console.log('📊 VERIFICACIÓN DE LÍMITE DE 20 PALABRAS');
console.log('=' .repeat(50));

// Mostrar últimos 5 comentarios con conteo de palabras
const last5 = historyData.conversations.slice(-5);

console.log('🔍 ÚLTIMOS 5 COMENTARIOS:');
console.log('-' .repeat(30));

let totalCumplimiento = 0;
let comentariosAnalizados = 0;

last5.forEach((comment, index) => {
    const timestamp = new Date(comment.timestamp).toLocaleTimeString();
    const palabras = contarPalabras(comment.analysis);
    const cumple = palabras <= 20;
    
    console.log(`\n${index + 1}. [${timestamp}] - ${cumple ? '✅' : '❌'} ${palabras} palabras`);
    console.log(`📝 "${comment.analysis}"`);
    
    if (cumple) totalCumplimiento++;
    comentariosAnalizados++;
});

console.log('\n' + '=' .repeat(50));
console.log('📈 ESTADÍSTICAS:');
console.log(`✅ Comentarios que cumplen el límite: ${totalCumplimiento}/${comentariosAnalizados}`);
console.log(`📊 Porcentaje de cumplimiento: ${((totalCumplimiento/comentariosAnalizados) * 100).toFixed(1)}%`);

if (totalCumplimiento === comentariosAnalizados) {
    console.log('🎉 ¡PERFECTO! Todos los comentarios respetan el límite de 20 palabras');
} else {
    console.log('⚠️ Algunos comentarios exceden el límite. Verificar configuración.');
}

console.log('\n💡 OBJETIVO: 100% de comentarios con máximo 20 palabras');
