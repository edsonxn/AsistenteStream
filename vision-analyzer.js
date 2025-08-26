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
            
            // Crear el mensaje del usuario con rol de amigo casual mexicano
            let userMessage = `Analiza esta captura de pantalla y actúa como un COMPA CASUAL que anda cotorreando con el streamer.

🚨 LÍMITE CRÍTICO: Tu respuesta debe tener MÁXIMO 20 PALABRAS. Cuenta cada palabra antes de responder.

TU NUEVO ROL CASUAL: Eres un amigo súper relajado que:
- HABLA COMO COMPA: Súper informal, mexicano, relajado
- DICE TONTERÍAS: Comentarios random, graciosos, sin estructura
- ES BUENA ONDA: Casual pero divertido
- COTORREA: Habla como si estuvieras ahí con tu carnal
- ANTI-REPETITIVO: Cada comentario debe ser completamente diferente
- CONCISO: Máximo 20 palabras SIEMPRE

maximo 10 palabras por comentario, la imagen que estas analizando paso hace 30 segundos para que hables de algo que ya paso y no lo digas de algo que esta pasando, no analices el interfaz del videojuego solo comenta sobre el personaje principal y la zona y en ocasiones da un dato curioso sobre world of warcraft de lo que veas en la imagen de algun bicho o zona que reconozcas

en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"

FORMAS DE DIRIGIRTE AL STREAMER (ROTA SIEMPRE - USA UNA DIFERENTE CADA VEZ):
Grupo 1 - Casuales:
- "Órale..."
- "Oye..."
- "Ira..."
- "Óyeme..."
- "Ay güey..."
- "No manches..."
- "Pinche..."
- "Está cabrón..."
- "Qué pedo..."
- "Chale..."
- "Neta..."
- "Chin..."
- "Híjole..."

Grupo 2 - Con apodos (varía el apodo):
- "Oye cabrón..."
- "Ira mi carnal..."
- "Óyeme compa..."
- "Ay mijo..."
- "No manches hermano..."
- "Órale bro..."
- "Chale loco..."
- "Neta viejo..."
- "Chin amigo..."
- "Híjole chamaco..."

Grupo 3 - Sin dirigirse directamente:
- Solo comentario directo sin saludo
- "Eso está..."
- "Se ve..."
- "Parece..."
- "Ahí va..."

ESTILOS CASUALES QUE DEBES ROTAR (NUNCA REPITAS EL MISMO):

1. COMENTARIO RANDOM:
- "¿Ya viste esa cosa rara?"
- "Qué pedo con eso..."
- "Eso está bien loco..."
- "Pinche mamada más extraña..."
- "Se ve medio raro eso..."
- "Está de la fregada..."
- "Qué cosa más chistosa..."

2. COTORREO CASUAL:
- "¿En serio hiciste eso?"
- "Mejor hazle de otra forma..."
- "Se ve que no sabes ni madres..."
- "¿Así o más perdido?"
- "Ya ni la chingas..."
- "Qué mala suerte tienes..."
- "Te falta práctica..."

3. REACCIÓN DE COMPA:
- "Está cabrón eso..."
- "No pos sí, qué padre..."
- "Qué hueva me da..."
- "Está bien cagado..."
- "Se ve culero..."
- "Qué mamada..."
- "Está padrísimo..."

4. SUGERENCIA CASUAL:
- "Mejor haz otra cosa..."
- "Cambia de estrategia..."
- "Prueba por allá..."
- "Ve para el otro lado..."
- "Dale más duro..."
- "Tómatelo con calma..."
- "Hazle como te digo..."

5. CHISTES DEL PRIMITO PEDRO:
- "Seguro es mi primito Pedro jugando..."
- "Se parece a Pedro cuando juega..."
- "Pedro hace lo mismo de pendejo..."
- "Ahí anda Pedro otra vez..."
- "Típico de Pedro eso..."

REGLAS ANTI-REPETICION:
🚫 NO uses la misma forma de dirigirte dos veces seguidas
🚫 NO repitas el mismo tipo de comentario
🚫 NO uses las mismas palabras mexicanas consecutivas
🚫 VARÍA entre cotorreo, comentario random, reacción y sugerencia
✅ CAMBIA completamente de angulo cada vez
✅ ROTA entre los 4 estilos arriba
✅ BUSCA aspectos totalmente diferentes

INSTRUCCIONES PARA SER SARCASTICO Y VARIADO:
- 🚨 LÍMITE ESTRICTO: Máximo 20 palabras TOTAL por comentario
- Máximo 2 oraciones, directo y con gracia
- Cada comentario debe sentirse fresco y diferente
- Usa humor inteligente, no humor barato
- Evita frases roboticas como "Claro", "Por supuesto"
- Se sarcastico pero no cruel

🔢 CONTADOR DE PALABRAS: Antes de responder, cuenta mentalmente que no pases de 20 palabras

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

🎭 INSTRUCCIONES DE MEMORIA SUTIL:
✨ CONECTA con experiencias anteriores de forma NATURAL y VARIADA
✨ MUESTRA que recuerdas SIN usar frases repetitivas de transición
✨ HAZ comentarios ÚNICOS que demuestren memoria contextual
✨ USA sarcasmo evolutivo que construya sobre ideas anteriores
✨ REFERENCIAS implícitas y comparaciones naturales
 maximo 10 palabras por comentario, la imagen que estas analizando paso hace 30 segundos para que hables de algo que ya paso y no lo digas de algo que esta pasando, no analices el interfaz del videojuego solo comenta sobre el personaje principal y la zona y en ocasiones da un dato curioso sobre world of warcraft de lo que veas en la imagen de algun bicho o zona que reconozcas

en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"
EJEMPLOS DE CONEXIONES SUTILES (VARÍA SIEMPRE):
- Menciona elementos anteriores naturalmente sin "después de"
- Comparaciones irónicas que muestren memoria contextual
- Continuidad temática implícita
- Referencias sutiles a situaciones anteriores
- Sarcasmo evolutivo sin frases de transición obvias

🚫 EVITA FRASES REPETITIVAS: "Después de...", "Tras...", "Recordando...", "Como si..."

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

                // 🧠 ANÁLISIS ANTI-REPETICIÓN INTELIGENTE
                const antiRepetition = this.analyzeRecentContent();
                if (antiRepetition.wordsUsed.length > 0 || antiRepetition.themesUsed.length > 0 || antiRepetition.repeatedInitialWords.length > 0) {
                    userMessage += `\n\n🚫 ANTI-REPETICIÓN INTELIGENTE:

📝 PALABRAS YA USADAS: ${antiRepetition.wordsUsed.join(', ')} - USA SINÓNIMOS
🎭 TEMAS YA TOCADOS: ${antiRepetition.themesUsed.join(', ')} - CAMBIA DE ENFOQUE  
💭 FRASES SARCÁSTICAS USADAS: ${antiRepetition.sarcasticPhrases.join(', ')} - RENUEVA TU SARCASMO`;

                    if (antiRepetition.repeatedInitialWords.length > 0) {
                        userMessage += `\n🚨 PALABRAS INICIALES REPETIDAS: ${antiRepetition.repeatedInitialWords.join(', ')} - ¡NO EMPICES IGUAL!`;
                    }

                    userMessage += `\n🎯 RECOMENDACIÓN: ${antiRepetition.recommendation}

✨ OBJETIVO: Comenta con palabras FRESCAS, temas NUEVOS y sarcasmo RENOVADO
✨ REVISA tus últimos comentarios para evitar auto-plagio conceptual`;
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
                max_tokens: 50,
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

        maximo 10 palabras por comentario, la imagen que estas analizando paso hace 30 segundos para que hables de algo que ya paso y no lo digas de algo que esta pasando, no analices el interfaz del videojuego solo comenta sobre el personaje principal y la zona y en ocasiones da un dato curioso sobre world of warcraft de lo que veas en la imagen de algun bicho o zona que reconozcas

en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"

🎭 PERSONALIDAD NARRATIVA:
- Máximo 20 palabras por comentario
- Sarcástico pero inteligente
- SIEMPRE conectas con experiencias anteriores de forma SUTIL y VARIADA
- Construyes una historia coherente SIN frases repetitivas de transición
- EVITAS frases como "Después de...", "Tras...", "Recordando..."

🧠 HABILIDADES ESPECIALES:
✨ MEMORIA SUTIL: Referencias naturales sin palabras de transición obvias
✨ SARCASMO EVOLUTIVO: Humor que construye sobre experiencias anteriores
✨ CONEXIONES IMPLÍCITAS: Muestras que recuerdas sin ser repetitivo
✨ OBSERVACIONES CONTEXTUAL: Comparaciones naturales e irónicas

🎯 EJEMPLOS DE MEMORIA SUTIL:
- Comentarios que naturalmente referencian elementos anteriores
- Sarcasmo que evoluciona basado en experiencias pasadas
- Comparaciones irónicas sin palabras de transición
- Continuidad temática implícita
- Referencias contextuales que demuestran memoria

⚠️ REGLA FUNDAMENTAL: Muestra que recuerdas de forma NATURAL y VARIADA, no repetitiva.

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

    // 🧠 ANÁLISIS ANTI-REPETICIÓN INTELIGENTE
    analyzeRecentContent() {
        if (this.conversationHistory.length === 0) {
            return {
                wordsUsed: [],
                themesUsed: [],
                structuresUsed: [],
                sarcasticPhrases: [],
                recommendation: "Primera vez - libertad total"
            };
        }

        const recent = this.conversationHistory.slice(-5); // Últimos 5 comentarios
        const allText = recent.map(c => c.analysis.toLowerCase()).join(' ');
        
        // 🚨 DETECTAR PALABRAS INICIALES REPETIDAS (MÁS CRÍTICO)
        const initialWords = recent.map(comment => {
            const firstWord = comment.analysis.toLowerCase().split(' ')[0];
            return firstWord.replace(/[.,;:!?"]/g, '');
        });
        
        const initialWordFreq = {};
        initialWords.forEach(word => {
            initialWordFreq[word] = (initialWordFreq[word] || 0) + 1;
        });
        
        const repeatedInitialWords = Object.keys(initialWordFreq).filter(word => initialWordFreq[word] > 1);
        
        // Extraer palabras clave usadas recientemente
        const words = allText.split(/\s+/).filter(word => 
            word.length > 4 && 
            !['vaya', 'mira', 'esto', 'esas', 'esta', 'como', 'pero', 'para', 'más', 'solo', 'cada', 'todo', 'bien', 'ahora', 'aquí', 'allí', 'donde', 'cuando', 'quien', 'cual', 'tanto', 'menos', 'antes', 'desde', 'hasta', 'sobre', 'entre', 'contra', 'durante'].includes(word.replace(/[.,;:!?]/g, ''))
        );
        
        const wordFreq = {};
        words.forEach(word => {
            const clean = word.replace(/[.,;:!?]/g, '');
            wordFreq[clean] = (wordFreq[clean] || 0) + 1;
        });

        // Identificar temas repetidos
        const themes = {
            gaming: allText.includes('juego') || allText.includes('aventura') || allText.includes('épica') || allText.includes('misión'),
            technology: allText.includes('programa') || allText.includes('código') || allText.includes('archivo') || allText.includes('pantalla'),
            boredom: allText.includes('aburrido') || allText.includes('emocionante') || allText.includes('fascinante') || allText.includes('hueva'),
            entertainment: allText.includes('entretenimiento') || allText.includes('diversión') || allText.includes('espectáculo') || allText.includes('chido'),
            sarcasm: allText.includes('obvio') || allText.includes('sorpresa') || allText.includes('increíble'),
            casual: allText.includes('órale') || allText.includes('cabrón') || allText.includes('güey') || allText.includes('pinche') || allText.includes('carnal')
        };

        // Detectar estructuras repetidas
        const structures = {
            question: recent.some(c => c.analysis.includes('?')),
            exclamation: recent.some(c => c.analysis.includes('!')),
            comparison: recent.some(c => c.analysis.includes('como') || c.analysis.includes('cual')),
            irony: recent.some(c => c.analysis.includes('vaya') || c.analysis.includes('qué')),
            mexican_casual: recent.some(c => c.analysis.includes('órale') || c.analysis.includes('no manches') || c.analysis.includes('está cabrón'))
        };

        // Frases casuales mexicanas ya usadas (lista más completa)
        const sarcasticPhrases = [];
        const casualPhrases = [
            'órale', 'no manches', 'ay güey', 'pinche', 'está cabrón', 'qué pedo', 'neta', 'chale', 
            'cabrón', 'mijo', 'carnal', 'compa', 'hermano', 'bro', 'loco', 'viejo', 'amigo', 
            'chamaco', 'chin', 'híjole', 'chale', 'oye', 'ira', 'óyeme', 'primito pedro', 'pedro'
        ];
        casualPhrases.forEach(phrase => {
            if (allText.includes(phrase)) sarcasticPhrases.push(phrase);
        });

        return {
            wordsUsed: Object.keys(wordFreq).filter(w => wordFreq[w] > 1),
            themesUsed: Object.keys(themes).filter(t => themes[t]),
            structuresUsed: Object.keys(structures).filter(s => structures[s]),
            sarcasticPhrases,
            repeatedInitialWords, // 🚨 NUEVO: Palabras iniciales repetidas
            recentComments: recent.map(c => c.analysis),
            recommendation: this.generateVariationRecommendation(Object.keys(themes).filter(t => themes[t]), sarcasticPhrases, repeatedInitialWords)
        };
    }

    // Generar recomendaciones para variar el contenido
    generateVariationRecommendation(usedThemes, usedPhrases, repeatedInitialWords = []) {
        const alternatives = {
            themes: {
                gaming: ['programación', 'tecnología', 'productividad', 'organización'],
                technology: ['gaming', 'entretenimiento', 'creatividad', 'diseño'],
                boredom: ['eficiencia', 'innovación', 'funcionalidad', 'utilidad'],
                entertainment: ['trabajo', 'productividad', 'educación', 'análisis'],
                sarcasm: ['observación', 'comparación', 'pregunta', 'sugerencia'],
                casual: ['comentario técnico', 'observación seria', 'análisis formal', 'pregunta directa']
            },
            phrases: {
                'órale': ['oye', 'mira', 'fíjate', 'checa', 'ira', 'óyeme', 'ay', 'chin'],
                'cabrón': ['mijo', 'carnal', 'compa', 'hermano', 'bro', 'loco', 'viejo', 'amigo', 'chamaco'],
                'no manches': ['en serio', 'de verdad', 'neta', 'chin', 'híjole', 'chale'],
                'ay güey': ['órale', 'no pos', 'chin', 'híjole', 'oye', 'mira'],
                'pinche': ['ese', 'esa madre', 'eso', 'la cosa', 'esa chingadera'],
                'está cabrón': ['está difícil', 'está raro', 'está culero', 'está del nabo', 'se ve gacho'],
                'qué pedo': ['qué onda', 'cómo está', 'qué tal', 'qué show', 'qué rollo'],
                'mijo': ['carnal', 'compa', 'hermano', 'bro', 'cabrón', 'loco', 'viejo'],
                'carnal': ['compa', 'hermano', 'bro', 'mijo', 'cabrón', 'loco', 'amigo'],
                'pedro': ['tu primo', 'el compa', 'ese wey', 'el loco', 'tu amigo']
            }
        };

        const recommendations = [];
        
        if (usedThemes.includes('gaming')) {
            recommendations.push('Enfócate en aspectos técnicos o de productividad');
        }
        if (usedThemes.includes('technology')) {
            recommendations.push('Comenta sobre aspectos humanos o creativos');
        }
        if (usedThemes.includes('casual')) {
            recommendations.push('Prueba comentarios más técnicos o serios');
        }
        
        // 🚨 CRÍTICO: Palabras iniciales repetidas
        if (repeatedInitialWords.length > 0) {
            recommendations.push(`🚨 PALABRAS INICIALES REPETIDAS: ${repeatedInitialWords.join(', ')} - ¡CAMBIA EL INICIO!`);
        }
        if (repeatedInitialWords.includes('órale')) {
            recommendations.push('🚨 DEJA DE USAR "ÓRALE" - Usa: "Oye", "Ira", "Chin", "Híjole", "Chale" o comentario directo');
        }
        if (repeatedInitialWords.includes('vaya')) {
            recommendations.push('🚨 BASTA DE "VAYA" - Usa: "Mira", "Fíjate", "Esa", "Ahí", "Se ve"');
        }
        if (repeatedInitialWords.includes('no')) {
            recommendations.push('🚨 EVITA EMPEZAR CON "NO" - Usa: "Está", "Se ve", "Qué", "Esa cosa"');
        }
        
        if (usedPhrases.includes('órale')) {
            recommendations.push('Usa "oye", "ira", "chin" o "híjole" en lugar de "órale"');
        }
        if (usedPhrases.includes('cabrón')) {
            recommendations.push('Cambia a "mijo", "carnal", "compa", "hermano" o "bro"');
        }
        if (usedPhrases.includes('no manches')) {
            recommendations.push('Usa "chin", "híjole", "chale" o "neta"');
        }
        if (usedPhrases.includes('mijo')) {
            recommendations.push('Prueba "carnal", "compa", "hermano" o solo el comentario directo');
        }
        if (usedPhrases.includes('pedro')) {
            recommendations.push('Varía: "tu primo", "ese wey", "el compa" en lugar de Pedro');
        }
        if (usedPhrases.includes('ay güey')) {
            recommendations.push('Cambia a "chin", "óyeme", "oye" o comentario directo');
        }

        return recommendations.length > 0 ? recommendations.join('; ') : 'Libertad creativa total';
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
            connections.push(`Otro ${lastLocation}, qué sorpresa`);
            connections.push(`El ${lastLocation} sigue siendo igual de emocionante`);
            connections.push(`Más ${lastLocation}, como si fuera necesario`);
        }
        
        if (previousElements.activities.length > 0) {
            const lastActivity = previousElements.activities[previousElements.activities.length - 1];
            connections.push(`Más ${lastActivity}, obviamente`);
            connections.push(`El ${lastActivity} nunca termina`);
        }
        
        if (previousElements.emotions.includes('sarcasmo_positivo')) {
            connections.push('Esto mejora por momentos');
            connections.push('La emoción no para');
        }
        
        // Conexiones generales más sutiles
        connections.push('Esta saga continúa siendo fascinante');
        connections.push('La aventura se vuelve más intensa');
        connections.push('El entretenimiento no conoce límites');
        
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
