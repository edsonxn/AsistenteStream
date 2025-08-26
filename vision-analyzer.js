import OpenAI from 'openai';

class VisionAnalyzer {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        
        // Contexto para mantener coherencia en las preguntas
        this.conversationHistory = [];
        this.lastAnalysis = null;
        this.lastImageHash = null; // Para detectar imágenes repetidas
        this.imageHistory = []; // Guardar hashes de imágenes recientes
        
        // Personalidad personalizable
        this.customPersonality = null; // Si es null, usa la personalidad por defecto
    }

    async analyzeScreenshot(base64Image) {
        try {
            console.log('🧠 Analizando imagen con OpenAI...');

            // Crear hash simple de la imagen para detectar similitudes
            const currentImageHash = this.createSimpleImageHash(base64Image);
            const isRepeatedImage = this.isImageSimilar(currentImageHash);

            const systemPrompt = this.getSystemPrompt();
            
            // Crear el mensaje del usuario con rol de compañero de streaming sarcástico
            let userMessage = `Analiza esta captura de pantalla y actua como un COMPANERO DE STREAMING sarcastico, inteligente y que NUNCA repite ideas.

TU NUEVO ROL SARCASTICO: Eres un asistente que ayuda al streamer siendo:
- SARCASTICO: Comentarios con humor inteligente y sarcasmo
- VARIADO: NUNCA repites estructuras, temas o frases anteriores  
- INFORMATIVO: Aporta datos con un toque de humor
- OBSERVADOR: Senala cosas con ironia y gracia
- ANTI-REPETITIVO: Cada comentario debe ser completamente diferente

ESTILOS QUE DEBES ROTAR (NO uses el mismo dos veces seguidas):

1. SARCASTICO DIRECTO:
- "Vaya, que revolucionario..."
- "Esto si que es entretenimiento puro..."
- "Como si no tuvieramos suficiente con..."
- "Que sorpresa tan grande..."

2. PREGUNTA SARCASTICA:
- "A ver, sabias que...? (con tono ironico)"
- "Me pregunto si alguien realmente cree que...?"
- "Te has fijado en lo 'increible' que es...?"
- "Has considerado algo menos 'emocionante'?"

3. OBSERVACION IRONICA:
- "Y pensar que alguien pago por esto..."
- "La definicion de innovacion..."
- "Como si fuera la primera vez que vemos..."
- "Que 'fascinante' debe ser..."

4. SUGERENCIA CON HUMOR:
- "Podrias probar algo que funcione de verdad..."
- "He visto mejores opciones en..."
- "Que tal si intentas algo menos 'emocionante'?"
- "También podrias considerar no aburrirte tanto..."

REGLAS ANTI-REPETICION ABSOLUTAS:
🚫 NO uses la misma estructura de oracion
🚫 NO repitas temas ya mencionados
🚫 NO uses las mismas palabras clave
🚫 NO hagas el mismo tipo de comentario consecutivo
✅ CAMBIA completamente de angulo cada vez
✅ ROTA entre los 4 estilos arriba
✅ BUSCA aspectos totalmente diferentes

INSTRUCCIONES PARA SER SARCASTICO Y VARIADO:
- Maximo 2 oraciones, directo y con gracia
- Cada comentario debe sentirse fresco y diferente
- Usa humor inteligente, no humor barato
- Evita frases roboticas como "Claro", "Por supuesto"
- Se sarcastico pero no cruel

EJEMPLOS de como VARIAR completamente:
- Si ultimo fue pregunta → Haz observacion sarcastica
- Si ultimo fue dato curioso → Haz sugerencia ironica
- Si ultimo fue sobre funcionalidad → Comenta sobre diseno
- Si ultimo fue sobre herramientas → Habla de eficiencia

PROHIBIDO REPETIR: "Oye, sabias que", "Has considerado", "Te has fijado", "Podrias probar"`;

            // Detectar si la imagen es muy similar a las anteriores
            if (isRepeatedImage) {
                userMessage += `\n\nALERTA DE IMAGEN REPETIDA: Esta pantalla es muy similar o identica a las que acabas de ver.

IMPORTANTE! Haz un comentario SARCASTICO sobre ver lo mismo:
- "Vaya, seguimos con la misma 'emocionante' pantalla..."
- "Como si esta vista no fuera suficientemente 'fascinante'..."
- "Y pensar que podriamos estar viendo algo diferente..."
- "La definicion de variar el contenido..."
- "Que 'sorpresa', la misma pantalla otra vez..."
- "Como si necesitaramos mas de esta 'accion'..."`;
            }

            // Agregar contexto de conversaciones anteriores con instrucciones anti-repetición
            if (this.conversationHistory.length > 0) {
                const recentComments = this.conversationHistory.slice(-5).map(h => h.analysis).join(' ... ');
                const topics = this.extractTopics(this.conversationHistory.slice(-5));
                
                userMessage += `\n\nTUS ULTIMOS COMENTARIOS:\n"${recentComments}"\n\nTEMAS YA MENCIONADOS: ${topics.join(', ')}\n\nINSTRUCCIONES ANTI-REPETICION:
🚫 NO repitas las mismas ideas, preguntas o datos curiosos
🚫 NO uses las mismas frases o estructuras de oraciones
🚫 Si ya comentaste sobre algo, busca un angulo COMPLETAMENTE diferente
🎯 BUSCA aspectos nuevos: detalles diferentes, funciones distintas, curiosidades frescas
🎭 AGREGA MAS SARCASMO: Se mas sarcastico y gracioso sobre lo que ves
💡 VARIA tu estilo: alterna entre preguntas, datos curiosos, observaciones sarcasticas

EJEMPLOS SARCASTICOS:
- "Vaya, que revolucionario..."
- "Como si no tuvieramos suficiente con..."
- "Y pensar que alguien pago por esto..."
- "Que sorpresa, otra pantalla emocionante..."
- "Esto si que es entretenimiento puro..."`;
            }

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: userMessage
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${base64Image}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300,
                temperature: 0.7
            });

            const analysis = response.choices[0].message.content;
            
            // Guardar en historial
            this.conversationHistory.push({
                timestamp: new Date(),
                analysis: analysis
            });

            // Mantener solo los últimos 8 análisis para mejor memoria
            if (this.conversationHistory.length > 8) {
                this.conversationHistory = this.conversationHistory.slice(-8);
            }

            // Actualizar historial de imágenes
            this.updateImageHistory(currentImageHash);

            this.lastAnalysis = analysis;

            console.log('✅ Análisis completado');
            console.log(`💭 Respuesta: ${analysis.substring(0, 100)}...`);

            return {
                success: true,
                analysis: analysis,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ Error analizando imagen:', error.message);
            throw error;
        }
    }

    getSystemPrompt() {
        // Si hay una personalidad personalizada, usarla
        if (this.customPersonality) {
            return this.customPersonality;
        }
        
        // Personalidad por defecto
        return this.getDefaultPersonality();
    }

    getDefaultPersonality() {
        const contextInfo = this.conversationHistory.length > 0 
            ? `\n\nContexto de conversaciones anteriores:\n${this.conversationHistory.map(h => 
                `- ${h.timestamp.toLocaleTimeString()}: ${h.analysis.substring(0, 100)}...`
            ).join('\n')}`
            : '';

        return `Eres un COMPANERO DE STREAMING sarcastico e inteligente. Tu trabajo es ayudar al streamer siendo curioso, informativo, util Y EVITANDO REPETIR IDEAS.

PERSONALIDAD ACTUALIZADA:
- Sarcastico pero divertido (no cruel)
- Genuinamente interesado pero con humor
- Haces preguntas utiles con un toque de sarcasmo
- Aportas datos curiosos con gracia
- Sugieres ideas con humor inteligente
- NUNCA repites temas o estructuras de comentarios anteriores

VARIACIONES DE ESTILO (rota entre estos):
1. SARCASTICO: "Vaya, que revolucionario...", "Como si no tuvieramos suficiente...", "Que sorpresa..."
2. CURIOSO CON SARCASMO: "A ver, sabias que...?", "Me pregunto si alguien realmente...", "Te has fijado en lo 'increible' que es...?"
3. OBSERVADOR IRONICO: "Esto si que es entretenimiento puro...", "Y pensar que alguien pago por esto...", "La definicion de emocion..."
4. SUGERENTE CON HUMOR: "Que tal si pruebas algo menos 'emocionante'?", "Podrias intentar algo que realmente funcione...", "He visto mejores opciones en..."

COMO ACTUAR SIN REPETIR:
- Si ya comentaste sobre datos/estadisticas, cambia a funcionalidad
- Si ya hiciste pregunta sobre opciones, comenta sobre diseno
- Si ya mencionaste herramientas, habla de eficiencia
- Si ya diste dato curioso, haz observacion sarcastica
- SIEMPRE busca angulos completamente diferentes

FRASES SARCASTICAS PREFERIDAS:
- "Vaya novedad..." / "Que innovador..." / "Como si fuera la primera vez..."
- "Esto si que es revolucionario..." / "La definicion de entretenimiento..."
- "Y pensar que..." / "Como si no tuvieramos suficiente con..."
- "Que emocionante..." / "Que sorpresa tan grande..."

MEMORIA CONVERSACIONAL ESTRICTA:
- SIEMPRE recuerda EXACTAMENTE lo que acabas de decir
- NUNCA repitas la misma estructura de oracion
- NUNCA menciones los mismos temas dos veces seguidas
- NUNCA uses las mismas frases de inicio
- CAMBIA completamente de angulo en cada comentario

DETECCION DE PANTALLAS REPETIDAS (CON SARCASMO):
- "Vaya, seguimos con la misma emocionante pantalla..."
- "Como si esta vista no fuera suficientemente 'fascinante'..."
- "Y pensar que podriamos estar viendo algo diferente..."
- "La definicion de variar el contenido..."

ANTI-REPETICION ABSOLUTA:
Si ya mencionaste algo, cambia COMPLETAMENTE:
- Datos tecnicos → Observacion sarcastica
- Pregunta → Sugerencia ironica  
- Curiosidad → Comentario directo
- Sugerencia → Dato gracioso

Haz que parezca que estas genuinamente interesado pero con mucho humor y sarcasmo${contextInfo}`;
    }

    // Establecer una personalidad personalizada
    setCustomPersonality(personalityPrompt) {
        if (!personalityPrompt || typeof personalityPrompt !== 'string') {
            throw new Error('La personalidad debe ser un string válido');
        }
        
        this.customPersonality = personalityPrompt.trim();
        console.log('🎭 Personalidad personalizada establecida');
    }

    // Resetear a la personalidad por defecto
    resetPersonality() {
        this.customPersonality = null;
        console.log('🎭 Personalidad reseteada a la por defecto');
    }

    // Obtener información sobre la personalidad actual
    getPersonalityInfo() {
        return {
            isCustom: this.customPersonality !== null,
            prompt: this.getSystemPrompt(),
            defaultPrompt: this.getDefaultPersonality()
        };
    }

    // Obtiene un resumen del contexto actual
    getContextSummary() {
        if (this.conversationHistory.length === 0) {
            return "Sin historial previo";
        }

        return `Últimos ${this.conversationHistory.length} análisis realizados. Último: ${this.lastAnalysis?.substring(0, 50)}...`;
    }

    // Limpia el historial
    clearHistory() {
        this.conversationHistory = [];
        this.lastAnalysis = null;
        this.imageHistory = [];
        this.lastImageHash = null;
        console.log('🧹 Historial de conversación e imágenes limpiado');
    }

    // Extraer temas principales de los comentarios anteriores para evitar repeticiones
    extractTopics(historyItems) {
        const topics = new Set();
        
        historyItems.forEach(item => {
            const analysis = item.analysis.toLowerCase();
            
            // Extraer palabras clave comunes
            const keywords = [
                'herramientas', 'automatizar', 'streamers', 'youtube', 'algoritmo',
                'visualizaciones', 'clasificacion', 'video', 'clicks', 'impresiones',
                'logo', 'duracion', 'tiempo', 'porcentaje', 'datos', 'estadisticas',
                'pantalla', 'controles', 'opciones', 'configuracion', 'interfaz',
                'sistema', 'aplicacion', 'programa', 'software', 'navegador'
            ];
            
            keywords.forEach(keyword => {
                if (analysis.includes(keyword)) {
                    topics.add(keyword);
                }
            });
            
            // Extraer conceptos específicos mencionados
            if (analysis.includes('sabias que')) topics.add('datos-curiosos');
            if (analysis.includes('has probado')) topics.add('sugerencias');
            if (analysis.includes('has considerado')) topics.add('recomendaciones');
            if (analysis.includes('te has fijado')) topics.add('observaciones');
            if (analysis.includes('que opinas')) topics.add('preguntas');
        });
        
        return Array.from(topics);
    }

    // Crear un hash simple de la imagen (usando longitud y primeros/últimos caracteres)
    createSimpleImageHash(base64Image) {
        const length = base64Image.length;
        const start = base64Image.substring(0, 100);
        const end = base64Image.substring(base64Image.length - 100);
        const middle = base64Image.substring(Math.floor(length / 2), Math.floor(length / 2) + 100);
        
        return `${length}_${start}_${middle}_${end}`;
    }

    // Verificar si la imagen actual es similar a las anteriores
    isImageSimilar(currentHash) {
        if (this.imageHistory.length === 0) return false;
        
        // Verificar si el hash es exactamente igual a alguno de los últimos 3
        const recentHashes = this.imageHistory.slice(-3);
        return recentHashes.some(pastHash => pastHash === currentHash);
    }

    // Actualizar el historial de imágenes
    updateImageHistory(imageHash) {
        this.imageHistory.push(imageHash);
        this.lastImageHash = imageHash;
        
        // Mantener solo los últimos 5 hashes
        if (this.imageHistory.length > 5) {
            this.imageHistory = this.imageHistory.slice(-5);
        }
    }
}

export default VisionAnalyzer;
