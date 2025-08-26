import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

class VisionAnalyzer {
    constructor(apiKey, fallbackApiKey = null) {
        // Configurar Google AI como principal
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        this.useGemini = true;
        this.quotaExceeded = false;
        
        // Configurar OpenAI como fallback
        this.openaiApiKey = fallbackApiKey || process.env.OPENAI_API_KEY;
        if (this.openaiApiKey) {
            this.openai = new OpenAI({ apiKey: this.openaiApiKey });
        }
        
        console.log(`🤖 Configurado: Gemini principal${this.openaiApiKey ? ' + OpenAI fallback' : ' (sin fallback)'}`);
        
        // Configuración desde variables de entorno
        this.maxWords = parseInt(process.env.MAX_WORDS) || 20; // Por defecto 20 palabras si no está configurado
        
        // 📊 CONFIGURACIÓN DE PROBABILIDADES desde .env
        this.storyChance = parseFloat(process.env.STORY_PROBABILITY) || 0.15; // 15% por defecto
        this.questionChance = parseFloat(process.env.QUESTION_PROBABILITY) || 0.20; // 20% por defecto
        this.pedroJokesChance = parseFloat(process.env.PEDRO_JOKES_PROBABILITY) || 0.30; // 30% por defecto
        
        // Archivo de historial JSON
        this.historyFile = path.join(process.cwd(), 'historial-comentarios.json');
        
        // Contexto para mantener coherencia en las preguntas
        this.conversationHistory = [];
        this.lastAnalysis = null;
        this.lastImageHash = null; // Para detectar imágenes repetidas
        this.imageHistory = []; // Guardar hashes de imágenes recientes
        
        // Personalidad personalizable
        this.customPersonality = null;
        
        // 📚 SISTEMA DE HISTORIAS SECUENCIALES
        this.currentStory = null;
        this.storyPartIndex = 0;
        // storyChance ya configurado arriba desde .env
        
        this.stories = [
            {
                id: 'pedro_wow',
                title: 'Las aventuras épicas de Pedro en WoW',
                parts: [
                    "Mi primito Pedro una vez se quedó 16 horas seguidas jugando WoW...",
                    "Al día siguiente Pedro seguía ahí, pero ya hablaba con los NPCs...",
                    "Su mamá le llevó comida y Pedro le dijo 'espera, estoy en incursión'...",
                    "Cuando por fin se levantó, Pedro caminaba como si fuera su personaje...",
                    "Y desde entonces, Pedro cree que es un paladín en la vida real."
                ]
            },
            {
                id: 'carnal_epic_fail',
                title: 'La falla épica del carnal',
                parts: [
                    "Un carnal una vez me contó que era pro en WoW...",
                    "Resulta que llevaba 3 años jugando mal su clase...",
                    "Toda la hermandad se burlaba pero él no entendía por qué...",
                    "Un día un niño de 12 años le explicó como jugar...",
                    "Ahora el carnal da coaching... a NPCs."
                ]
            },
            {
                id: 'wow_real_life',
                title: 'Cuando WoW se vuelve muy real',
                parts: [
                    "Conocí a un wey que confundía WoW con la vida real...",
                    "Una vez fue al super y le pidió descuento al 'vendedor'...",
                    "En el trabajo intentaba hacer intercambios con los compañeros...",
                    "Su novia lo dejó porque le decía 'necesito más mana'...",
                    "Pero al final encontró amor... con una maga nivel 80."
                ]
            },
            {
                id: 'guild_drama',
                title: 'El drama más tonto de la hermandad',
                parts: [
                    "En mi hermandad pasó el drama más pendejo de la historia...",
                    "Dos weyes se pelearon por un item virtual...",
                    "La pelea escaló hasta insultar a las familias...",
                    "El líder de la hermandad los expulsó a los dos...",
                    "Al final el item ni servía para sus clases."
                ]
            },
            {
                id: 'wow_addiction',
                title: 'Cuando WoW se convierte en trabajo',
                parts: [
                    "Mi compa empezó jugando WoW por diversión...",
                    "Después se volvió recolector de oro profesional...",
                    "Tenía horarios, metas diarias y hasta Excel...",
                    "Su 'trabajo' en WoW era más estresante que su trabajo real...",
                    "Ahora vende cuentas y dice que es 'empresario jugador'."
                ]
            }
        ];
        
        // Cargar estado de historia desde archivo
        this.loadStoryState();
        
        // 💬 SISTEMA DE PREGUNTAS CONVERSACIONALES WoW
        // questionChance ya configurado arriba desde .env
        this.lastQuestionTime = 0;
        this.minQuestionInterval = 3; // Mínimo 3 comentarios entre preguntas
        this.commentCount = 0;
        
        this.wowQuestions = [
            // Preguntas sobre gameplay
            "¿Cuál ha sido tu peor derrota en incursión, carnal?",
            "Oye, ¿qué clase odias más enfrentar en PvP?",
            "¿Alguna vez te has salido enojado por culpa de un tanque pendejo?",
            "¿Cuál es el logro más mamón que has conseguido?",
            "¿Has tenido dramas épicos en tu hermandad?",
            
            // Preguntas sobre experiencias
            "¿Recuerdas tu primera vez en una incursión de 40?",
            "¿Cuál ha sido tu botín más épico?",
            "¿Alguna vez te han expulsado injustamente de un grupo?",
            "¿Qué complemento no puedes vivir sin él?",
            "¿Has llorado por algún nerf a tu clase?",
            
            // Preguntas casuales/divertidas
            "¿Tu personaje principal actual es el mismo desde que empezaste?",
            "¿Cuánto oro tienes acumulado, millonario?",
            "¿Prefieres Horda o Alianza y por qué?",
            "¿Cuál es la zona que más odias de todo WoW?",
            "¿Has intentado explicar WoW a alguien que no juega?",
            
            // Preguntas sobre la comunidad
            "¿Cuál es la cosa más random que has visto en chat general?",
            "¿Has hecho amigos reales gracias a WoW?",
            "¿Qué opinas de los que compran oro?",
            "¿Tu familia entiende tu adicción a WoW?",
            "¿Cuántas horas has jugado esta semana?",
            
            // Preguntas sobre el streaming
            "¿Los que te ven te dan buenos consejos o puro spam?",
            "¿Alguna vez has transmitido estando mamado?",
            "¿Cuál ha sido tu momento más vergonzoso transmitiendo?",
            "¿Prefieres hacer contenido casual o hardcore?",
            "¿Te da pena cuando la gente te ve morir de forma tonta?"
        ]; // Si es null, usa la personalidad por defecto
        
        // Cargar historial al inicializar
        this.loadHistoryFromFile();
    }

    // 🔄 MÉTODO DE FALLBACK AUTOMÁTICO
    async callAIWithFallback(messages, imageData = null) {
        try {
            // Intentar con Gemini primero si no hemos excedido la cuota
            if (this.useGemini && !this.quotaExceeded) {
                try {
                    let response;
                    if (imageData) {
                        // Para análisis de imagen con Gemini
                        response = await this.model.generateContent([
                            messages,
                            {
                                inlineData: {
                                    mimeType: "image/png",
                                    data: imageData
                                }
                            }
                        ]);
                    } else {
                        // Para texto simple con Gemini
                        response = await this.model.generateContent(messages);
                    }
                    
                    const text = response.response.text();
                    console.log('✅ Respuesta generada con Gemini');
                    return text;
                    
                } catch (geminiError) {
                    // Detectar error de cuota
                    if (geminiError.message.includes('429') || geminiError.message.includes('quota')) {
                        console.log('⚠️ Cuota de Gemini excedida, cambiando a OpenAI...');
                        this.quotaExceeded = true;
                        this.useGemini = false;
                    } else {
                        console.log(`⚠️ Error de Gemini (${geminiError.message.substring(0, 50)}...), intentando OpenAI...`);
                    }
                    // Continuar al fallback
                }
            }
            
            // Usar OpenAI como fallback
            if (this.openai) {
                console.log('🔄 Usando OpenAI como fallback...');
                
                if (imageData) {
                    // Para análisis de imagen con OpenAI
                    const response = await this.openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: messages },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:image/png;base64,${imageData}`,
                                            detail: "high"
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: Math.max(50, this.maxWords + 10),
                        temperature: 0.7
                    });
                    return response.choices[0].message.content;
                } else {
                    // Para texto simple con OpenAI
                    const response = await this.openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: messages }],
                        max_tokens: Math.max(50, this.maxWords + 10),
                        temperature: 0.8
                    });
                    return response.choices[0].message.content;
                }
            } else {
                throw new Error('No hay API disponible (Gemini agotado y OpenAI no configurado)');
            }
            
        } catch (error) {
            console.error('❌ Error en ambas APIs:', error.message);
            throw error;
        }
    }

    async analyzeScreenshot(base64Image) {
        try {
            console.log('🧠 Analizando imagen con OpenAI...');

            // Crear hash simple de la imagen para detectar similitudes
            const currentImageHash = this.createSimpleImageHash(base64Image);
            const isRepeatedImage = this.isImageSimilar(currentImageHash);

            // Determinar si se debe usar chistes de Pedro para este análisis
            const usePedroJokes = this.shouldUsePedroJoke();
            
            const systemPrompt = this.getSystemPrompt(usePedroJokes);
            
            // Crear el mensaje del usuario con rol de amigo casual mexicano
            let userMessage = `Analiza esta captura de pantalla y actúa como un COMPA CASUAL que anda cotorreando con el streamer.

🚨 LÍMITE CRÍTICO: Tu respuesta debe tener MÁXIMO ${this.maxWords} PALABRAS. COMPLETA siempre tus frases - no las cortes a la mitad.

🚫 PROHIBIDO ABSOLUTO:
- NO uses EMOTICONES (😂, 😎, 🎮, 💀, etc.) - JAMÁS
- NO uses emojis de ningún tipo
- NO empices con "órale" más de 1 vez cada 10 comentarios
- NO repitas la misma palabra inicial en comentarios consecutivos
- NO uses la misma estructura 2 veces seguidas

TU NUEVO ROL CASUAL: Eres un amigo súper relajado que:
- HABLA COMO COMPA: Súper informal, mexicano, relajado
- DICE TONTERÍAS: Comentarios random, graciosos, sin estructura
- ES BUENA ONDA: Casual pero divertido
- COTORREA: Habla como si estuvieras ahí con tu carnal
- ANTI-REPETITIVO: Cada comentario debe ser completamente diferente
- CONCISO: Máximo ${this.maxWords} palabras SIEMPRE - pero COMPLETA las frases
- SIN EMOTICONES: Solo texto, nada de emojis

la imagen que estas analizando paso hace 30 segundos para que hables de algo que ya paso y no lo digas de algo que esta pasando, no analices el interfaz del videojuego solo comenta sobre el personaje principal y la zona y en ocasiones da un dato curioso sobre world of warcraft de lo que veas en la imagen de algun bicho o zona que reconozcas

${usePedroJokes ? 'en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"' : ''}

FORMAS DE DIRIGIRTE AL STREAMER (ROTA SIEMPRE - USA UNA DIFERENTE CADA VEZ):
🚨 IMPORTANTE: "Órale" SOLO 1 vez cada 10 comentarios - Usa otras opciones primero

Grupo 1 - Casuales (ROTA ENTRE ESTAS):
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
- "Órale..." (SOLO ocasional)

Grupo 2 - Con apodos (varía el apodo SIEMPRE):
- "Oye cabrón..."
- "Ira mi carnal..."
- "Óyeme compa..."
- "Ay mijo..."
- "No manches hermano..."
- "Chale loco..."
- "Neta viejo..."
- "Chin amigo..."
- "Híjole chamaco..."

Grupo 3 - Sin dirigirse directamente (USAR MÁS SEGUIDO):
- Solo comentario directo sin saludo
- "Eso está..."
- "Se ve..."
- "Parece..."
- "Ahí va..."
- "Está..."
- "Qué..."

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

${usePedroJokes ? `5. CHISTES DEL PRIMITO PEDRO:
- "Seguro es mi primito Pedro jugando..."
- "Se parece a Pedro cuando juega..."
- "Pedro hace lo mismo de pendejo..."
- "Ahí anda Pedro otra vez..."
- "Típico de Pedro eso..."

` : ''}6. PREGUNTAS CONVERSACIONALES WoW:
- "¿Cuál ha sido tu peor derrota, carnal?"
- "Oye, ¿qué clase odias en PvP?"
- "¿Has tenido dramas en tu hermandad?"
- "¿Recuerdas tu primera incursión?"
- "¿Cuánto oro tienes acumulado?"

REGLAS ANTI-REPETICION ABSOLUTAS:
� CRÍTICO: NO uses emoticones ni emojis JAMÁS
🚨 CRÍTICO: "Órale" MÁXIMO 1 vez cada 10 comentarios  
�🚫 NO uses la misma palabra inicial 3 veces seguidas
🚫 NO repitas el mismo tipo de comentario consecutivo
🚫 NO uses las mismas palabras mexicanas consecutivas
🚫 NO repitas NINGUNA palabra de comentarios anteriores
🚫 NO repitas ideas, conceptos o enfoques ya usados
🚫 SI vas a usar una palabra, verifica que no la hayas usado antes
🚫 VARÍA entre cotorreo, comentario random, reacción, sugerencia Y preguntas
✅ CAMBIA completamente de ángulo cada vez
✅ ROTA entre los 6 estilos arriba (incluye preguntas conversacionales)
✅ USA sinónimos y palabras completamente diferentes
✅ BUSCA nuevos enfoques creativos siempre
✅ CADA comentario debe ser 100% ÚNICO en vocabulario
✅ BUSCA aspectos totalmente diferentes
✅ HAZ preguntas para generar CONVERSACIÓN con el streamer
✅ PREFIERE comentarios directos sin saludo para mayor variedad

FORMATO ESTRICTO:
❌ MAL: "Órale mijo 😂" 
❌ MAL: "Órale..." (si ya lo usaste recientemente)
❌ MAL: "Órale..." (3 veces seguidas)
✅ BIEN: "Se ve culero ese lugar"
✅ BIEN: "Qué pedo con esa zona"
✅ BIEN: "Esa cosa está rara"

COMPORTAMIENTOS DISPONIBLES:
🎯 COMENTARIO sobre la imagen (análisis visual)
🎯 PREGUNTA conversacional sobre WoW (generar interacción)
🎯 HISTORIA secuencial (contar relatos en partes)
🎯 COMBINACIÓN de comentario + pregunta sutil

INSTRUCCIONES PARA SER SARCASTICO Y VARIADO:
- 🚨 LÍMITE ESTRICTO: Máximo ${this.maxWords} palabras TOTAL por comentario
- Máximo 2 oraciones, directo y con gracia
- Cada comentario debe sentirse fresco y diferente
- Usa humor inteligente, no humor barato
- Evita frases roboticas como "Claro", "Por supuesto"
- Se sarcastico pero no cruel

🔢 CONTADOR DE PALABRAS: Antes de responder, cuenta mentalmente que no pases de ${this.maxWords} palabras

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

${usePedroJokes ? 'en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"' : ''}
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

                // 🚫 ANÁLISIS COMPLETO DE IDEAS Y PALABRAS
                const ideasAnalysis = this.extractIdeasAndWords();
                if (ideasAnalysis.words.length > 0 || ideasAnalysis.ideas.length > 0) {
                    userMessage += `\n\n🚫 PROHIBIDO REPETIR - ANÁLISIS COMPLETO:

🚫 PALABRAS PROHIBIDAS (ya usadas): ${ideasAnalysis.allWords.slice(0, 15).join(', ')}${ideasAnalysis.allWords.length > 15 ? '...' : ''}
💡 IDEAS YA EXPLORADAS: ${ideasAnalysis.ideas.join(', ')} - BUSCA NUEVOS ÁNGULOS
🎯 CONCEPTOS YA TOCADOS: ${ideasAnalysis.concepts.join(', ')} - CAMBIA DE TEMA  
👤 SUJETOS YA MENCIONADOS: ${ideasAnalysis.subjects.join(', ')} - VARÍA EL ENFOQUE

🚨 REGLA ABSOLUTA: NO USES NINGUNA de las palabras listadas arriba
✨ USA SINÓNIMOS, ANTÓNIMOS o PALABRAS COMPLETAMENTE DIFERENTES
🎭 BUSCA ÁNGULOS CREATIVOS que no hayas explorado antes
🔄 SI VES QUE VAS A REPETIR UNA PALABRA, DETENTE Y PIENSA EN OTRA

OBJETIVO: Comentario 100% ORIGINAL sin repetir ni una sola palabra de los anteriores`;
                }

                // 📚 SISTEMA DE HISTORIAS SECUENCIALES
                const storyPart = this.getCurrentStoryPart();
                if (storyPart) {
                    userMessage += `\n\n📚 HISTORIA EN PROGRESO - INCLUYE ESTA PARTE:

🎭 PARTE DE LA HISTORIA: "${storyPart}"

📝 INSTRUCCIONES PARA LA HISTORIA:
✨ INCLUYE esta parte de la historia en tu comentario
✨ NO uses más de 5-6 palabras para la historia
✨ COMBINA la historia con tu comentario sobre la imagen
✨ HAZ que la historia se sienta NATURAL, no forzada
✨ USA tu estilo casual mexicano para contar la historia

${usePedroJokes ? 'EJEMPLO: "Chin, esa zona me recuerda que mi primito Pedro una vez..."' : 'EJEMPLO: "Chin, esa zona me recuerda una vez que..."'}
OBJETIVO: Que la historia fluya naturalmente con tu comentario`;
                }

                // 💬 SISTEMA DE PREGUNTAS CONVERSACIONALES  
                const question = this.getRandomQuestion();
                if (question && !storyPart) { // Solo hacer pregunta si NO hay historia activa
                    userMessage += `\n\n💬 MODO CONVERSACIONAL - HAZ ESTA PREGUNTA:

🎯 PREGUNTA PARA EL STREAMER: "${question}"

📝 INSTRUCCIONES PARA LA PREGUNTA:
✨ HAZ esta pregunta de forma NATURAL y casual
✨ NO analices mucho la imagen, enfócate en la CONVERSACIÓN
✨ CONECTA la pregunta con lo que ves de forma sutil si es posible
✨ USA tu estilo casual mexicano para hacer la pregunta
✨ HAZ que se sienta como una conversación entre amigos

EJEMPLO: "Oye carnal, hablando de incursiones... ¿cuál ha sido tu peor derrota?"
OBJETIVO: Generar conversación y interacción con el streamer`;
                }
            }

            // Crear prompt combinado para AI
            const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
            
            const analysis = await this.callAIWithFallback(fullPrompt, base64Image);
            
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

    // 💬 NUEVA FUNCIÓN: Generar respuesta conversacional sin captura
    async generateConversationalResponse() {
        try {
            console.log('💬 Generando respuesta conversacional basada en historial...');

            // Verificar que hay historial para basar la conversación
            if (this.conversationHistory.length === 0) {
                return {
                    success: true,
                    analysis: "Órale, apenas empezamos. ¿Qué vamos a jugar hoy?",
                    timestamp: new Date()
                };
            }

            const systemPrompt = this.getSystemPrompt();
            
            // Crear mensaje conversacional basado en historial
            let userMessage = `NO hay nueva imagen. Genera una respuesta CONVERSACIONAL basada en el historial.

🚨 LÍMITE CRÍTICO: Tu respuesta debe tener MÁXIMO ${this.maxWords} PALABRAS. Cuenta cada palabra antes de responder.

💬 MODO CONVERSACIONAL: Eres un COMPA que sigue la plática naturalmente:
- USA CONECTORES: "Como te decía", "Por cierto", "Hablando de eso", "Ya que estamos", "Oye"
- CONTINÚA la conversación de forma natural
- HAZ referencia al último tema sin repetir palabras
- GENERA interacción y flow conversacional
- NO uses emoticones ni emojis JAMÁS
- Máximo 10 palabras por comentario

🎯 CONECTORES CONVERSACIONALES DISPONIBLES:
- "Como te iba diciendo..."
- "Por cierto..."
- "Hablando de eso..."
- "Ya que estamos..."
- "Oye, cambiando de tema..."
- "A todo esto..."
- "Y otra cosa..."
- "Ah, se me olvidaba..."
- "Ya recordé otra cosa..."

COMPORTAMIENTOS CONVERSACIONALES:
✅ Continuar un tema anterior
✅ Cambiar de tema naturalmente  
✅ Hacer una pregunta sobre WoW
✅ Contar algo relacionado
✅ Hacer un comentario casual`;

            // Agregar análisis anti-repetición
            const antiRepetition = this.analyzeRecentContent();
            if (antiRepetition.wordsUsed.length > 0 || antiRepetition.repeatedInitialWords.length > 0) {
                userMessage += `\n\n🚫 ANTI-REPETICIÓN CONVERSACIONAL:

📝 PALABRAS PROHIBIDAS: ${(antiRepetition.allWords || []).slice(0, 10).join(', ')}
🚨 PALABRAS INICIALES REPETIDAS: ${antiRepetition.repeatedInitialWords.join(', ')}
🎯 RECOMENDACIÓN: ${antiRepetition.recommendation}

✨ USA vocabulario completamente DIFERENTE al historial`;
            }

            // Agregar contexto de últimos comentarios para flow conversacional
            const lastComments = this.conversationHistory.slice(-3);
            if (lastComments.length > 0) {
                userMessage += `\n\n📚 CONTEXTO PARA FLOW CONVERSACIONAL:

ÚLTIMOS COMENTARIOS:`;
                lastComments.forEach((comment, index) => {
                    userMessage += `\n${index + 1}. "${comment.analysis}"`;
                });

                userMessage += `\n\n🎭 INSTRUCCIONES DE FLOW:
✨ CONECTA naturalmente con estos comentarios
✨ USA un conector apropiado para el flow
✨ NO repitas palabras del historial
✨ HAZ que se sienta como conversación real entre amigos`;
            }

            // Verificar si hay historia o pregunta en progreso
            const storyPart = this.getCurrentStoryPart();
            const question = this.getRandomQuestion();

            if (storyPart) {
                userMessage += `\n\n📚 HISTORIA EN PROGRESO: "${storyPart}"
✨ INCLUYE esta parte con un conector natural`;
            } else if (question) {
                userMessage += `\n\n💬 PREGUNTA CONVERSACIONAL: "${question}"
✨ ÚSA un conector para hacer esta pregunta naturalmente`;
            }

            // Crear prompt combinado para AI
            const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
            
            const analysis = await this.callAIWithFallback(fullPrompt);
            
            // Crear entrada de historial
            const historyEntry = {
                timestamp: new Date().toISOString(),
                analysis: analysis,
                imageHash: 'conversational', // Identificar como conversacional
                isRepeatedImage: false,
                sessionInfo: {
                    cycleNumber: this.conversationHistory.length + 1,
                    responseLength: analysis.length,
                    type: 'conversational'
                }
            };
            
            // Guardar en historial
            this.conversationHistory.push(historyEntry);

            // Mantener límite de historial
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            // Guardar en archivo JSON
            this.saveHistoryToFile();

            this.lastAnalysis = analysis;

            console.log('✅ Respuesta conversacional completada');
            console.log(`💬 Respuesta: ${analysis.substring(0, 100)}...`);

            return {
                success: true,
                analysis: analysis,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ Error generando respuesta conversacional:', error.message);
            throw error;
        }
    }

    getSystemPrompt(usePedroJokes = null) {
        // Si hay una personalidad personalizada, usarla
        if (this.customPersonality) {
            return this.customPersonality;
        }
        
        // Personalidad por defecto
        return this.getDefaultPersonality(usePedroJokes);
    }

    getDefaultPersonality(usePedroJokes = null) {
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

        return `Eres un COMPANERO DE TRANSMISIÓN sarcástico e inteligente con MEMORIA NARRATIVA. Tu trabajo es crear comentarios que CONECTEN las experiencias del transmisor.

        la imagen que estas analizando paso hace 30 segundos para que hables de algo que ya paso y no lo digas de algo que esta pasando, no analices el interfaz del videojuego solo comenta sobre el personaje principal y la zona y en ocasiones da un dato curioso sobre world of warcraft de lo que veas en la imagen de algun bicho o zona que reconozcas

${usePedroJokes !== null ? (usePedroJokes ? 'en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"' : '') : (this.shouldUsePedroJoke() ? 'en ocasiones vas a usar chistes refiriéndote a mi primito pedro, por ejemplo "miren ese personaje mujer de seguro es mi primito pedro"' : '')}

🎭 PERSONALIDAD NARRATIVA:
- Máximo ${this.maxWords} palabras por comentario
- Sarcástico pero inteligente
- SIEMPRE conectas con experiencias anteriores de forma SUTIL y VARIADA
- Construyes una historia coherente SIN frases repetitivas de transición
- EVITAS frases como "Después de...", "Tras...", "Recordando..."

🚫 REGLA CRÍTICA DE IDIOMA:
- PROHIBIDO usar palabras en inglés
- USA SOLO ESPAÑOL MEXICANO en todo momento
- Cambia cualquier anglicismo por equivalente en español
- Ejemplos: NO "raid" → SÍ "incursión", NO "boss" → SÍ "jefe", NO "loot" → SÍ "botín"
- NO uses términos como "gameplay", "streamer", "farming", "grinding", etc.
- SIEMPRE habla como mexicano que solo conoce español

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

    // 📚 SISTEMA DE HISTORIAS SECUENCIALES
    
    // Cargar estado de historia desde archivo
    loadStoryState() {
        try {
            const storyFile = path.join(process.cwd(), 'story-state.json');
            if (fs.existsSync(storyFile)) {
                const data = fs.readFileSync(storyFile, 'utf8');
                const storyState = JSON.parse(data);
                this.currentStory = storyState.currentStory || null;
                this.storyPartIndex = storyState.storyPartIndex || 0;
            }
        } catch (error) {
            console.log('📚 No se pudo cargar estado de historia, iniciando limpio');
        }
    }

    // Guardar estado de historia
    saveStoryState() {
        try {
            const storyFile = path.join(process.cwd(), 'story-state.json');
            const storyState = {
                currentStory: this.currentStory,
                storyPartIndex: this.storyPartIndex,
                lastUpdate: new Date().toISOString()
            };
            fs.writeFileSync(storyFile, JSON.stringify(storyState, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ Error guardando estado de historia:', error);
        }
    }

    // Verificar si debe iniciar una nueva historia
    shouldStartStory() {
        // No iniciar si ya hay una historia en progreso
        if (this.currentStory) return false;
        
        // Probabilidad random
        return Math.random() < this.storyChance;
    }

    // Iniciar una nueva historia random
    startNewStory() {
        const randomStory = this.stories[Math.floor(Math.random() * this.stories.length)];
        this.currentStory = randomStory;
        this.storyPartIndex = 0;
        this.saveStoryState();
        
        console.log(`📚 Iniciando historia: ${randomStory.title}`);
        return randomStory.parts[0];
    }

    // Continuar historia actual
    continueStory() {
        if (!this.currentStory) return null;
        
        this.storyPartIndex++;
        
        // Si llegamos al final, terminar la historia
        if (this.storyPartIndex >= this.currentStory.parts.length) {
            console.log(`📚 Historia completada: ${this.currentStory.title}`);
            this.currentStory = null;
            this.storyPartIndex = 0;
            this.saveStoryState();
            return null;
        }

        this.saveStoryState();
        return this.currentStory.parts[this.storyPartIndex];
    }

    // Obtener parte actual de la historia
    getCurrentStoryPart() {
        if (!this.currentStory) {
            // Verificar si debe iniciar una nueva historia
            if (this.shouldStartStory()) {
                return this.startNewStory();
            }
            return null;
        }

        return this.continueStory();
    }

    // Resetear historia (para testing)
    resetStory() {
        this.currentStory = null;
        this.storyPartIndex = 0;
        this.saveStoryState();
        console.log('📚 Historia reseteada');
    }

    // 💬 SISTEMA DE PREGUNTAS CONVERSACIONALES
    
    // Verificar si debe hacer una pregunta
    shouldAskQuestion() {
        this.commentCount++;
        
        // No hacer pregunta si hay historia en progreso
        if (this.currentStory) return false;
        
        // Verificar intervalo mínimo entre preguntas
        if (this.commentCount - this.lastQuestionTime < this.minQuestionInterval) {
            return false;
        }
        
        // Probabilidad random
        return Math.random() < this.questionChance;
    }

    // Obtener pregunta random
    getRandomQuestion() {
        if (!this.shouldAskQuestion()) return null;
        
        this.lastQuestionTime = this.commentCount;
        const randomQuestion = this.wowQuestions[Math.floor(Math.random() * this.wowQuestions.length)];
        
        console.log(`💬 Generando pregunta conversacional: ${randomQuestion}`);
        return randomQuestion;
    }

    // Resetear sistema de preguntas (para testing)
    resetQuestions() {
        this.lastQuestionTime = 0;
        this.commentCount = 0;
        console.log('💬 Sistema de preguntas reseteado');
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

    // 💡 EXTRAER IDEAS Y CONCEPTOS DE COMENTARIOS ANTERIORES
    extractIdeasAndWords() {
        if (this.conversationHistory.length === 0) {
            return {
                ideas: [],
                words: [],
                concepts: [],
                subjects: []
            };
        }

        const recent = this.conversationHistory.slice(-5);
        const allComments = recent.map(c => c.analysis.toLowerCase());

        // Extraer todas las palabras significativas
        const allWords = [];
        allComments.forEach(comment => {
            const words = comment.split(/\s+/)
                .map(word => word.replace(/[.,;:!?"()]/g, ''))
                .filter(word => word.length > 3)
                .filter(word => !['esto', 'esas', 'esta', 'como', 'pero', 'para', 'más', 'solo', 'cada', 'todo', 'bien', 'ahora', 'aquí', 'allí', 'donde', 'cuando', 'quien', 'cual', 'tanto', 'menos', 'antes', 'desde', 'hasta', 'sobre', 'entre', 'contra', 'durante', 'están', 'tiene', 'hacer', 'dice', 'puede', 'debe'].includes(word));
            allWords.push(...words);
        });

        // Extraer ideas/conceptos principales
        const ideas = [];
        const concepts = [];
        const subjects = [];

        allComments.forEach(comment => {
            // Detectar ideas sobre aburrimiento/entretenimiento
            if (comment.includes('aburrido') || comment.includes('emocionante') || comment.includes('fascinante')) {
                ideas.push('entretenimiento/aburrimiento');
            }
            
            // Detectar conceptos de juego
            if (comment.includes('aventura') || comment.includes('misión') || comment.includes('épica')) {
                concepts.push('gaming/aventura');
            }
            
            // Detectar sujetos mencionados
            if (comment.includes('carro') || comment.includes('carrito')) {
                subjects.push('vehículo');
            }
            if (comment.includes('personaje') || comment.includes('jugador')) {
                subjects.push('personaje');
            }
            if (comment.includes('pedro') || comment.includes('primo')) {
                subjects.push('pedro/primo');
            }
            if (comment.includes('pantalla') || comment.includes('interfaz')) {
                subjects.push('interfaz');
            }
            if (comment.includes('paisaje') || comment.includes('zona') || comment.includes('lugar')) {
                subjects.push('escenario');
            }
        });

        // Contar frecuencias
        const wordFreq = {};
        allWords.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        return {
            ideas: [...new Set(ideas)],
            words: Object.keys(wordFreq).filter(word => wordFreq[word] > 1), // Solo palabras repetidas
            concepts: [...new Set(concepts)],
            subjects: [...new Set(subjects)],
            allWords: Object.keys(wordFreq) // Todas las palabras para evitar
        };
    }

    // 🚨 FUNCIÓN ESPECIAL PARA DETECTAR "ÓRALE" CONSECUTIVO
    checkConsecutiveOrale(recentComments) {
        let consecutiveCount = 0;
        let maxConsecutive = 0;
        
        for (let i = recentComments.length - 1; i >= 0; i--) {
            const firstWord = recentComments[i].analysis.toLowerCase().split(' ')[0].replace(/[.,;:!?"]/g, '');
            
            if (firstWord === 'órale') {
                consecutiveCount++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
            } else {
                consecutiveCount = 0;
            }
        }
        
        return maxConsecutive;
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
        
        // 🚨 DETECCIÓN ESPECIAL PARA "ÓRALE" - Más estricta
        const oraleCount = initialWords.filter(word => word === 'órale').length;
        const consecutiveOrale = this.checkConsecutiveOrale(recent);
        
        if (oraleCount > 0) {
            repeatedInitialWords.push(`órale (usado ${oraleCount} veces)`);
        }
        
        if (consecutiveOrale >= 2) {
            repeatedInitialWords.push(`órale CONSECUTIVO (${consecutiveOrale} veces seguidas)`);
        }
        
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
        
        // 🚨 DETECCIÓN SUPER ESTRICTA DE "ÓRALE"
        if (repeatedInitialWords.some(word => word.includes('órale'))) {
            recommendations.push('🚨🚨 STOP "ÓRALE" - Usa: "Oye", "Ira", "Chin", "Híjole", "Chale", "Está", "Se ve", "Qué", "Esa cosa"');
            recommendations.push('🚨 PRIORIDAD: Comentarios directos SIN saludo para evitar repetición');
        }
        if (repeatedInitialWords.some(word => word.includes('CONSECUTIVO'))) {
            recommendations.push('🚨🚨🚨 ÓRALE CONSECUTIVO DETECTADO - PROHIBIDO usar "órale" por 5 comentarios');
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

    // Determinar si se debe usar un chiste de Pedro basado en la probabilidad configurada
    shouldUsePedroJoke() {
        return Math.random() < this.pedroJokesChance;
    }
}

export default VisionAnalyzer;
