import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

class VisionAnalyzer {
    constructor(apiKey) {
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        
        // Archivo de historial JSON
        this.historyFile = path.join(process.cwd(), 'historial-comentarios.json');
        
        // Contexto para mantener coherencia en las preguntas
        this.conversationHistory = [];
        this.lastAnalysis = null;
        this.lastImageHash = null; // Para detectar imágenes repetidas
        this.imageHistory = []; // Guardar hashes de imágenes recientes
        
        // Personalidad personalizable
        this.customPersonality = null; // Si es null, usa la personalidad por defecto
        
        // Cargar historial al inicializar
        this.loadHistoryFromFile();
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

            // 🧠 CONTEXTO NARRATIVO: Usar los últimos 2 comentarios para construir conexiones
            if (this.conversationHistory.length > 0) {
                const last2Comments = this.conversationHistory.slice(-2);
                
                if (last2Comments.length >= 2) {
                    // Extraer elementos narrativos de los comentarios anteriores para conexiones inteligentes
                    const narrativeElements = this.extractNarrativeElements(last2Comments);
                    const connectionPhrases = this.generateNarrativeConnections(narrativeElements, 'current_context');
                    const prevComment = last2Comments[0].analysis;
                    const lastComment = last2Comments[1].analysis;
                    
                    userMessage += `\n\n🧠 CONTEXTO NARRATIVO - CONECTA TUS EXPERIENCIAS:

📝 COMENTARIO ANTERIOR: "${prevComment}"
📝 ULTIMO COMENTARIO: "${lastComment}"

🎭 INSTRUCCIONES ESPECIALES:
✨ CONECTA lo que ves AHORA con las 2 experiencias anteriores
✨ HAZ REFERENCIA a lo que comentaste antes (ejemplo: "Recuerdo que antes vimos X, y ahora...")
✨ CONSTRUYE una narrativa coherente que conecte las 3 experiencias
✨ USA sarcasmo pero mantén la conexión temporal/espacial
✨ MENCIONA específicamente elementos de los comentarios anteriores

EJEMPLOS DE CONEXIONES NARRATIVAS:
- "Después de ver [elemento anterior], ahora nos encontramos con..."
- "Vaya, de [situación anterior] hemos pasado a..."
- "Recordando [detalle anterior], esto es aún más..."
- "Como si [comentario anterior] no fuera suficiente, ahora..."
- "Tras esa 'emocionante' [experiencia anterior], llegamos a..."

� OBJETIVO: Que el streamer sienta que el asistente REALMENTE recuerda y conecta las experiencias`;
                } else if (last2Comments.length === 1) {
                    // Solo hay 1 comentario anterior
                    const lastComment = last2Comments[0].analysis;
                    
                    userMessage += `\n\n🧠 CONTEXTO NARRATIVO - SEGUNDA EXPERIENCIA:

📝 MI COMENTARIO ANTERIOR: "${lastComment}"

🎭 INSTRUCCIONES ESPECIALES:
✨ CONECTA lo que ves AHORA con tu experiencia anterior
✨ HAZ REFERENCIA específica a lo que comentaste antes
✨ CONSTRUYE una progresión narrativa natural
✨ USA frases como "Después de [X], ahora..." o "Tras ver [Y], llegamos a..."

🎯 Esta es tu SEGUNDA observación, conecta con la primera`;
                }
                
                // También agregar temas mencionados para evitar repeticiones
                const topics = this.extractTopics(this.conversationHistory.slice(-3));
                if (topics.length > 0) {
                    userMessage += `\n\n⚠️ TEMAS YA COMENTADOS: ${topics.join(', ')} - Busca ángulos DIFERENTES`;
                }
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
            
            // Crear entrada de historial con metadata completa
            const historyEntry = {
                timestamp: new Date().toISOString(),
                analysis: analysis,
                imageHash: currentImageHash,
                isRepeatedImage: isRepeatedImage,
                sessionInfo: {
                    cycleNumber: this.conversationHistory.length + 1,
                    responseLength: analysis.length
                }
            };
            
            // Guardar en historial de memoria
            this.conversationHistory.push(historyEntry);

            // Mantener solo los últimos 20 análisis en memoria para mejor rendimiento
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            // Guardar en archivo JSON (mantiene historial completo)
            this.saveHistoryToFile();

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
        // Crear contexto narrativo mejorado con los últimos comentarios
        let contextInfo = '';
        if (this.conversationHistory.length > 0) {
            const last2Comments = this.conversationHistory.slice(-2);
            
            if (last2Comments.length >= 2) {
                contextInfo = `\n\n🧠 MEMORIA NARRATIVA RECIENTE:
📖 Penúltimo comentario: "${last2Comments[0].analysis.substring(0, 150)}..."
📖 Último comentario: "${last2Comments[1].analysis.substring(0, 150)}..."

💡 Recuerda: Debes CONECTAR tus nuevos comentarios con estas experiencias anteriores.`;
            } else if (last2Comments.length === 1) {
                contextInfo = `\n\n🧠 MEMORIA NARRATIVA:
📖 Mi comentario anterior: "${last2Comments[0].analysis.substring(0, 150)}..."

💡 Esta será tu segunda observación - conecta con la anterior.`;
            }
        }

        return `Eres un COMPANERO DE STREAMING sarcástico e inteligente con MEMORIA NARRATIVA. Tu trabajo es crear comentarios que CONECTEN las experiencias del streamer.

🎭 PERSONALIDAD NARRATIVA:
- Máximo 35 palabras por comentario
- Sarcástico pero inteligente
- SIEMPRE conectas con experiencias anteriores cuando las tienes
- Construyes una historia coherente entre comentarios
- Usas frases de transición temporal ("Después de...", "Tras ver...", "Recordando...")

🧠 HABILIDADES ESPECIALES:
✨ MEMORIA CONECTIVA: Referencias específicas a comentarios anteriores
✨ PROGRESIÓN NARRATIVA: Cada comentario es parte de una historia mayor
✨ SARCASMO CONTEXTUAL: Humor que considera lo que ya has visto
✨ OBSERVACIONES EVOLUTIVAS: Comparas situaciones actuales con anteriores

🎯 EJEMPLOS DE CONEXIONES NARRATIVAS:
- "Después de [X que vimos antes], ahora nos encontramos con..."
- "Vaya, de [situación anterior] hemos evolucionado a..."
- "Recordando [detalle anterior], esto es aún más interesante porque..."
- "Como si [experiencia anterior] no fuera suficiente, ahora..."
- "Tras esa 'emocionante' [cosa anterior], llegamos a..."

⚠️ REGLA FUNDAMENTAL: Si tienes comentarios anteriores, SIEMPRE haz al menos UNA referencia específica a ellos.

VARIACIONES DE ESTILO CONECTIVO:
1. PROGRESIÓN SARCÁSTICA: "De X a Y, vaya evolución..."
2. COMPARACIÓN IRÓNICA: "Si X era interesante, esto es..."
3. CONTINUIDAD HUMORÍSTICA: "Después de ver X, esto confirma que..."
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
        
        // También limpiar el archivo JSON
        this.saveHistoryToFile();
        console.log('🧹 Historial de conversación e imágenes limpiado (memoria y archivo)');
    }

    // 📂 MÉTODOS DE HISTORIAL JSON

    // Cargar historial desde archivo JSON
    loadHistoryFromFile() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf8');
                const historyData = JSON.parse(data);
                
                // Cargar solo los últimos 20 comentarios para no sobrecargar
                this.conversationHistory = historyData.conversations?.slice(-20) || [];
                this.lastAnalysis = historyData.lastAnalysis || null;
                
                console.log(`📖 Historial cargado: ${this.conversationHistory.length} comentarios anteriores`);
            } else {
                console.log('📄 Creando nuevo archivo de historial');
                this.saveHistoryToFile();
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error.message);
            this.conversationHistory = [];
        }
    }

    // 🧠 Extraer elementos narrativos de comentarios anteriores para crear conexiones
    extractNarrativeElements(comments) {
        const elements = {
            locations: [],
            activities: [],
            emotions: [],
            objects: [],
            transitions: []
        };

        comments.forEach(comment => {
            const text = comment.analysis.toLowerCase();
            
            // Extraer ubicaciones/lugares
            const locationKeywords = ['bosque', 'posada', 'ciudad', 'mazmorra', 'montaña', 'rio', 'castillo', 'pueblo', 'aldea', 'campo', 'pantalla', 'menu', 'interfaz', 'ventana'];
            locationKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    elements.locations.push(keyword);
                }
            });
            
            // Extraer actividades
            const activityKeywords = ['luchando', 'corriendo', 'explorando', 'recolectando', 'hablando', 'comprando', 'vendiendo', 'navegando', 'programando', 'escribiendo', 'jugando'];
            activityKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    elements.activities.push(keyword);
                }
            });
            
            // Extraer emociones/tonos del comentario anterior
            if (text.includes('emocionante') || text.includes('fascinante')) {
                elements.emotions.push('sarcasmo_positivo');
            }
            if (text.includes('aburrido') || text.includes('repetitivo')) {
                elements.emotions.push('critica');
            }
        });

        return elements;
    }

    // 🎭 Generar frases de conexión narrativa
    generateNarrativeConnections(previousElements, currentContext) {
        const connections = [];
        
        if (previousElements.locations.length > 0) {
            const lastLocation = previousElements.locations[previousElements.locations.length - 1];
            connections.push(`Después de explorar ${lastLocation}`);
            connections.push(`Tras esa aventura en ${lastLocation}`);
            connections.push(`Recordando ese fascinante ${lastLocation}`);
        }
        
        if (previousElements.activities.length > 0) {
            const lastActivity = previousElements.activities[previousElements.activities.length - 1];
            connections.push(`Después de estar ${lastActivity}`);
            connections.push(`Como si ${lastActivity} no fuera suficiente`);
        }
        
        if (previousElements.emotions.includes('sarcasmo_positivo')) {
            connections.push('Si eso era "emocionante", esto es');
            connections.push('Como continuación de esa "fascinante" experiencia');
        }
        
        // Conexiones generales siempre disponibles
        connections.push('Continuando con esta épica aventura');
        connections.push('Como secuela de lo anterior');
        connections.push('En el siguiente capítulo de esta saga');
        
        return connections;
    }

    // Guardar historial en archivo JSON
    saveHistoryToFile() {
        try {
            const historyData = {
                metadata: {
                    version: "1.0",
                    lastUpdated: new Date().toISOString(),
                    totalConversations: this.conversationHistory.length
                },
                conversations: this.conversationHistory,
                lastAnalysis: this.lastAnalysis,
                statistics: {
                    totalComments: this.conversationHistory.length,
                    firstComment: this.conversationHistory[0]?.timestamp || null,
                    lastComment: this.conversationHistory[this.conversationHistory.length - 1]?.timestamp || null
                }
            };

            fs.writeFileSync(this.historyFile, JSON.stringify(historyData, null, 2), 'utf8');
            console.log(`💾 Historial guardado: ${this.conversationHistory.length} comentarios`);
        } catch (error) {
            console.error('❌ Error guardando historial:', error.message);
        }
    }

    // Obtener estadísticas del historial
    getHistoryStats() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf8');
                const historyData = JSON.parse(data);
                return {
                    totalComments: historyData.conversations?.length || 0,
                    lastUpdated: historyData.metadata?.lastUpdated || null,
                    memoryComments: this.conversationHistory.length,
                    fileSize: fs.statSync(this.historyFile).size
                };
            }
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
        }
        return { totalComments: 0, memoryComments: 0, fileSize: 0 };
    }

    // Exportar historial completo (para respaldos)
    exportFullHistory() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = fs.readFileSync(this.historyFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('❌ Error exportando historial:', error.message);
        }
        return null;
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
