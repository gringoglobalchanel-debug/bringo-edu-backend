const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configurar multer para archivos en memoria (más eficiente)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  }
});


// ✅ CONFIGURACIÓN OAUTH 2.0 - FUNCIONA CON CUENTA PERSONAL
const configureGoogleDrive = () => {
  try {
    // VERIFICAR CREDENCIALES OAUTH 2.0 (LAS NUEVAS)
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.warn('⚠️  Google Drive OAuth no configurado - faltan credenciales OAuth');
      console.log('ℹ️  Variables necesarias: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
      return null;
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://bringo-edu-backend-2.onrender.com'
    );

    // Configurar con el refresh token
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    console.log('✅ Google Drive OAuth configurado correctamente');
    return google.drive({ version: 'v3', auth });
    
  } catch (error) {
    console.error('❌ Error configurando Google Drive OAuth:', error);
    return null;
  }
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Bringo Edu Backend funcionando!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: ['openai-plans', 'google-drive-export']
  });
});

// Endpoint para generar planes TRIMESTRALES - CORREGIDO
app.post('/api/generate-plan', async (req, res) => {
  // Configurar CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { nombreProfesor, institucion, gradoPlan, materia, trimestre } = req.body;

    console.log('📨 Solicitud recibida para plan trimestral:', {
      nombreProfesor, institucion, gradoPlan, materia, trimestre
    });

    // Validar campos requeridos
    if (!nombreProfesor || !institucion || !gradoPlan || !materia || !trimestre) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: nombreProfesor, institucion, gradoPlan, materia, trimestre' 
      });
    }

    // Validar trimestre
    const trimestresValidos = ['Primer Trimestre', 'Segundo Trimestre', 'Tercer Trimestre'];
    if (!trimestresValidos.includes(trimestre)) {
      return res.status(400).json({ 
        error: 'Trimestre debe ser: Primer Trimestre, Segundo Trimestre o Tercer Trimestre' 
      });
    }

    // API Key desde variables de entorno
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY no configurada en variables de entorno');
      return res.status(500).json({ 
        error: 'Configuración del servidor incompleta - falta API Key' 
      });
    }

    const prompt = `Eres un especialista en el Currículo Nacional de Panamá (MEDUCA). Genera un plan de estudios COMPLETO y DETALLADO para el TRIMESTRE específico:

**CONTEXTO:**
- GRADO: ${gradoPlan}
- ASIGNATURA: ${materia} 
- TRIMESTRE: ${trimestre}
- DOCENTE: ${nombreProfesor}
- CENTRO EDUCATIVO: ${institucion}

**INSTRUCCIONES CRÍTICAS - GENERA SOLO JSON VÁLIDO:**

**1. ESTRUCTURA OBLIGATORIA - DEBE INCLUIR desarrollo_clases para CADA contenido:**

{
  "plan_trimestral": {
    "informacion_general": {
      "grado": "${gradoPlan}",
      "asignatura": "${materia}",
      "trimestre": "${trimestre}",
      "docente": "${nombreProfesor}",
      "institucion": "${institucion}",
      "anioEscolar": "${new Date().getFullYear()}",
      "duracionSemanas": "10-12",
      "contenidos_conceptuales": ["array de 3-5 contenidos REALES del currículo MEDUCA"],
      "competencias": ["array de 3-5 competencias específicas MEDUCA"],
      "indicadores_de_logro": ["array de 4-6 indicadores observables y medibles"]
    },
    "estructura_pedagogica": {
      "estrategias_metodologicas": ["array de 3-4 estrategias aplicables"],
      "recursos_materiales": ["array de recursos CONCRETOS y disponibles"],
      "instrumentos_evaluacion": {
        "formativa": ["array de 3-4 instrumentos formativos"],
        "sumativa": ["array de 2-3 instrumentos sumativos"]
      },
      "adaptaciones_curriculares": ["array de 2-3 adaptaciones para diversidad"]
    },
    "desarrollo_clases": {
      "CONTENIDO_1_TITULO_REAL": {
        "duracion": "3-4 sesiones de 45 minutos",
        "objetivos_aprendizaje": ["3-4 objetivos medibles y específicos"],
        "materiales_recursos": ["materiales CONCRETOS para este contenido"],
        "sesiones_detalladas": [
          {
            "titulo": "SESIÓN 1 - Introducción y exploración inicial",
            "actividades": [
              {
                "tiempo": "0-10 min",
                "descripcion": "ACTIVIDAD CONCRETA: Presentación interactiva usando ejemplos reales del contexto panameño"
              },
              {
                "tiempo": "10-25 min", 
                "descripcion": "ACTIVIDAD CONCRETA: Lluvia de ideas grupal sobre conceptos previos con participación activa"
              },
              {
                "tiempo": "25-40 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicio práctico guiado usando material concreto disponible en aulas"
              },
              {
                "tiempo": "40-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Síntesis de aprendizajes y anticipación de la próxima sesión"
              }
            ]
          },
          {
            "titulo": "SESIÓN 2 - Desarrollo y aplicación práctica",
            "actividades": [
              {
                "tiempo": "0-15 min",
                "descripcion": "ACTIVIDAD CONCRETA: Repaso interactivo de la sesión anterior con preguntas dirigidas"
              },
              {
                "tiempo": "15-35 min",
                "descripcion": "ACTIVIDAD CONCRETA: Trabajo en equipos resolviendo problemas del contexto local panameño"
              },
              {
                "tiempo": "35-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Presentación de soluciones y coevaluación entre compañeros"
              }
            ]
          },
          {
            "titulo": "SESIÓN 3 - Profundización y evaluación formativa",
            "actividades": [
              {
                "tiempo": "0-20 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicios de mayor complejidad con apoyo del docente"
              },
              {
                "tiempo": "20-35 min",
                "descripcion": "ACTIVIDAD CONCRETA: Aplicación de instrumento de evaluación formativa individual"
              },
              {
                "tiempo": "35-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Retroalimentación personalizada y establecimiento de metas"
              }
            ]
          }
        ]
      },
      "CONTENIDO_2_TITULO_REAL": {
        "duracion": "2-3 sesiones de 45 minutos",
        "objetivos_aprendizaje": ["3-4 objetivos medibles"],
        "materiales_recursos": ["materiales específicos para este contenido"],
        "sesiones_detalladas": [
          {
            "titulo": "SESIÓN 1 - Fundamentos conceptuales básicos",
            "actividades": [
              {
                "tiempo": "0-15 min",
                "descripcion": "ACTIVIDAD CONCRETA: Exposición dialogada con apoyo visual y ejemplos locales"
              },
              {
                "tiempo": "15-30 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicios de aplicación básica con supervisión docente"
              },
              {
                "tiempo": "30-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Socialización de aprendizajes y dudas frecuentes"
              }
            ]
          },
          {
            "titulo": "SESIÓN 2 - Práctica integradora y colaborativa", 
            "actividades": [
              {
                "tiempo": "0-25 min",
                "descripcion": "ACTIVIDAD CONCRETA: Resolución de casos prácticos en equipos cooperativos"
              },
              {
                "tiempo": "25-40 min",
                "descripcion": "ACTIVIDAD CONCRETA: Presentación de soluciones creativas al grupo completo"
              },
              {
                "tiempo": "40-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Coevaluación entre pares y autoevaluación del proceso"
              }
            ]
          }
        ]
      },
      "CONTENIDO_3_TITULO_REAL": {
        "duracion": "2-3 sesiones de 45 minutos", 
        "objetivos_aprendizaje": ["3-4 objetivos medibles"],
        "materiales_recursos": ["materiales específicos"],
        "sesiones_detalladas": [
          {
            "titulo": "SESIÓN 1 - Aproximación inicial al contenido",
            "actividades": [
              {
                "tiempo": "0-10 min",
                "descripcion": "ACTIVIDAD CONCRETA: Activación de conocimientos previos mediante preguntas detonadoras"
              },
              {
                "tiempo": "10-30 min",
                "descripcion": "ACTIVIDAD CONCRETA: Exploración guiada del tema con ejemplos contextualizados"
              },
              {
                "tiempo": "30-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicio de aplicación inicial con retroalimentación inmediata"
              }
            ]
          },
          {
            "titulo": "SESIÓN 2 - Consolidación y práctica extendida",
            "actividades": [
              {
                "tiempo": "0-20 min",
                "descripcion": "ACTIVIDAD CONCRETA: Profundización en aspectos clave del contenido"
              },
              {
                "tiempo": "20-40 min",
                "descripcion": "ACTIVIDAD CONCRETA: Actividad práctica extendida con variados niveles de complejidad"
              },
              {
                "tiempo": "40-45 min",
                "descripcion": "ACTIVIDAD CONCRETA: Reflexión metacognitiva sobre el proceso de aprendizaje"
              }
            ]
          }
        ]
      }
    },
    "observaciones": "Texto con recomendaciones prácticas para implementación en el aula panameña"
  }
}

**2. REQUISITOS ESPECÍFICOS:**

- Los CONTENIDOS deben ser REALES del currículo MEDUCA para ${gradoPlan} ${materia}
- Cada contenido en "desarrollo_clases" debe tener entre 2-4 sesiones REALISTAS
- Las ACTIVIDADES deben ser CONCRETAS, PRÁCTICAS y APLICABLES en aula panameña
- Los MATERIALES deben ser ESPECÍFICOS y disponibles en escuelas panameñas
- Las DURACIONES deben ser REALISTAS (45 minutos por sesión)
- Los OBJETIVOS deben ser MEDIBLES y ESPECÍFICOS
- DEBEN generarse DESARROLLOS DE CLASES para TODOS los contenidos listados

**3. EJEMPLOS DE ACTIVIDADES CONCRETAS:**
- "Los estudiantes identificarán patrones usando fichas de colores en equipos de 4"
- "Trabajo en equipos resolviendo problemas matemáticos del contexto local panameño"
- "Elaboración de mapa conceptual colaborativo sobre temas de ciencias sociales"
- "Simulación de situaciones reales aplicando conceptos de lengua y literatura"

**IMPORTANTE: Responde ÚNICAMENTE con el JSON válido, sin texto adicional, sin comentarios, sin markdown.**`;

    console.log('🔄 Enviando solicitud a OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto pedagogo especializado en el currículo del MEDUCA de Panamá. Generas planes trimestrales detallados, profesionales y alineados con el marco curricular panameño. Responde SOLO con JSON válido, sin texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de OpenAI:', response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Hemos alcanzado el límite temporal de solicitudes a nuestro servicio de IA. Por favor intenta de nuevo en 1-2 minutos.',
          tipo: 'rate_limit',
          codigo: 'RATE_LIMIT_EXCEEDED'
        });
      } else if (response.status === 401) {
        return res.status(500).json({ 
          error: 'Error de configuración del servicio. Por favor contacta al administrador.',
          tipo: 'auth_error',
          codigo: 'INVALID_API_KEY'
        });
      } else {
        return res.status(500).json({ 
          error: 'Error temporal del servicio de IA. Por favor intenta nuevamente en unos minutos.',
          tipo: 'openai_error',
          codigo: `OPENAI_${response.status}`
        });
      }
    }

    const data = await response.json();
    const contenidoGenerado = data.choices[0].message.content;
    
    console.log('✅ Respuesta recibida de OpenAI');

    // Extraer JSON del contenido
    let jsonStr = contenidoGenerado;
    if (contenidoGenerado.includes('```json')) {
      jsonStr = contenidoGenerado.split('```json')[1].split('```')[0].trim();
    } else if (contenidoGenerado.includes('```')) {
      jsonStr = contenidoGenerado.split('```')[1].split('```')[0].trim();
    }
    
    // Validar y parsear JSON
    let planContenido;
    try {
      planContenido = JSON.parse(jsonStr);
      
      // 🔍 DEBUG: VER QUÉ GENERÓ OPENAI
      console.log('🔍 DEBUG - Plan generado por OpenAI:', JSON.stringify(planContenido, null, 2));
      
      // ✅ CORREGIR ESTRUCTURA PARA EL FRONTEND - VERSIÓN MEJORADA
      // Si la respuesta viene dentro de plan_trimestral, extraerla
      if (planContenido.plan_trimestral) {
        planContenido = planContenido.plan_trimestral;
      }

      if (planContenido.informacion_general && planContenido.informacion_general.contenidos_conceptuales) {
        planContenido.contenidos = planContenido.informacion_general.contenidos_conceptuales;
        planContenido.competencias = planContenido.informacion_general.competencias;
        planContenido.indicadoresLogro = planContenido.informacion_general.indicadores_de_logro;
      }

      if (planContenido.estructura_pedagogica) {
        planContenido.metodologia = planContenido.estructura_pedagogica.estrategias_metodologicas?.join(', ') || 'Estrategias metodológicas variadas';
        planContenido.recursos = planContenido.estructura_pedagogica.recursos_materiales;
        planContenido.adaptaciones = planContenido.estructura_pedagogica.adaptaciones_curriculares;
        planContenido.evaluacion = planContenido.estructura_pedagogica.instrumentos_evaluacion?.formativa || ['Evaluación formativa continua'];
      }

      // ✅ CORREGIDO: PROCESAR DESARROLLO DE CLASES - VERSIÓN MEJORADA
      if (planContenido.desarrollo_clases) {
        planContenido.desarrolloClases = {};
        
        // Convertir desarrollo_clases al formato que espera el frontend
        Object.entries(planContenido.desarrollo_clases).forEach(([contenidoKey, desarrollo]) => {
          planContenido.desarrolloClases[contenidoKey] = {
            duracion: desarrollo.duracion || '3 sesiones de 45 minutos',
            objetivos: desarrollo.objetivos_aprendizaje || desarrollo.objetivos || [
              'Comprender conceptos fundamentales',
              'Aplicar conocimientos en situaciones prácticas'
            ],
            materiales: desarrollo.materiales_recursos || desarrollo.materiales || [
              'Material didáctico impreso',
              'Recursos multimedia'
            ],
            // ✅ CORRECCIÓN CRÍTICA: Convertir "sesiones_detalladas" a "fases"
            fases: (desarrollo.sesiones_detalladas || []).map((sesion, index) => ({
              titulo: sesion.titulo || `Sesión ${index + 1}`,
              actividades: sesion.actividades || [
                { tiempo: '45 min', descripcion: 'Desarrollo de la sesión' }
              ]
            }))
          };
        });
        
        console.log('✅ Desarrollo de clases procesado correctamente');
        console.log('📊 Contenidos con desarrollo:', Object.keys(planContenido.desarrolloClases));
        
      } else if (planContenido.contenidos && Array.isArray(planContenido.contenidos)) {
        // Si no viene desarrollo_clases, crear uno automático para CADA contenido
        console.log('⚠️  No se encontró desarrollo_clases, generando automáticamente');
        planContenido.desarrolloClases = {};
        
        planContenido.contenidos.forEach((contenido, index) => {
          const tituloContenido = contenido.length > 50 ? contenido.substring(0, 47) + '...' : contenido;
          
          planContenido.desarrolloClases[tituloContenido] = {
            duracion: '3 sesiones de 45 minutos',
            objetivos: [
              `Comprender los conceptos de: ${contenido.substring(0, 30)}`,
              'Aplicar conocimientos en situaciones prácticas',
              'Desarrollar habilidades de análisis y creatividad'
            ],
            materiales: [
              'Material didáctico impreso',
              'Recursos multimedia',
              'Instrumentos de evaluación formativa'
            ],
            fases: [
              {
                titulo: 'SESIÓN 1 - Introducción y exploración',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Presentación del tema y activación de conocimientos previos' },
                  { tiempo: '20 min', descripcion: 'Explicación teórica con ejemplos prácticos' },
                  { tiempo: '15 min', descripcion: 'Ejercicio guiado de aplicación inicial' }
                ]
              },
              {
                titulo: 'SESIÓN 2 - Desarrollo y práctica',
                actividades: [
                  { tiempo: '15 min', descripcion: 'Repaso de conceptos clave' },
                  { tiempo: '25 min', descripcion: 'Actividad práctica en equipos colaborativos' },
                  { tiempo: '5 min', descripcion: 'Socialización de resultados' }
                ]
              },
              {
                titulo: 'SESIÓN 3 - Profundización y evaluación',
                actividades: [
                  { tiempo: '20 min', descripcion: 'Ejercicios de mayor complejidad' },
                  { tiempo: '15 min', descripcion: 'Aplicación de instrumento de evaluación' },
                  { tiempo: '10 min', descripcion: 'Retroalimentación y conclusiones' }
                ]
              }
            ]
          };
        });
      } else {
        // Fallback final
        console.log('⚠️  No se pudieron generar desarrollos de clase');
        planContenido.desarrolloClases = {
          "Contenido general": {
            duracion: '3 sesiones de 45 minutos',
            objetivos: ['Desarrollar competencias específicas', 'Aplicar conocimientos prácticos'],
            materiales: ['Material básico del aula'],
            fases: [
              {
                titulo: 'Sesión introductoria',
                actividades: [
                  { tiempo: '45 min', descripcion: 'Desarrollo completo de la sesión' }
                ]
              }
            ]
          }
        };
      }
      
      console.log('🔍 DEBUG - Plan corregido:', JSON.stringify(planContenido, null, 2));
      console.log('🔍 DEBUG - Tiene desarrolloClases?:', !!planContenido.desarrolloClases);
      
    } catch (parseError) {
      console.error('❌ Error parseando JSON de OpenAI:', parseError);
      // Fallback básico con desarrolloClases
      planContenido = {
        grado: gradoPlan,
        asignatura: materia,
        trimestre: trimestre,
        docente: nombreProfesor,
        institucion: institucion,
        anioEscolar: new Date().getFullYear().toString(),
        duracionSemanas: 11,
        contenidos: ['Contenido 1 según MEDUCA', 'Contenido 2 según MEDUCA', 'Contenido 3 según MEDUCA'],
        competencias: ['Competencia 1 MEDUCA', 'Competencia 2 MEDUCA'],
        indicadoresLogro: ['Indicador 1 observable', 'Indicador 2 medible'],
        metodologia: 'Estrategias metodológicas alineadas con MEDUCA',
        recursos: ['Recursos educativos estándar'],
        evaluacion: ['Instrumentos de evaluación formativa y sumativa'],
        adaptaciones: ['Adaptaciones para atención a la diversidad'],
        observaciones: 'Plan generado automáticamente basado en currículo MEDUCA',
        desarrolloClases: {
          "Contenido 1: Contenido 1 según MEDUCA...": {
            duracion: '3 sesiones de 45 minutos',
            objetivos: [
              'Comprender los conceptos fundamentales',
              'Aplicar los conocimientos en situaciones prácticas',
              'Desarrollar habilidades de análisis'
            ],
            materiales: [
              'Material didáctico impreso',
              'Recursos multimedia',
              'Instrumentos de evaluación'
            ],
            fases: [
              {
                titulo: 'SESIÓN 1 - Introducción y contextualización',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Presentación del tema y objetivos' },
                  { tiempo: '15 min', descripcion: 'Activación de conocimientos previos' },
                  { tiempo: '20 min', descripcion: 'Exposición teórica interactiva' }
                ]
              },
              {
                titulo: 'SESIÓN 2 - Desarrollo y práctica',
                actividades: [
                  { tiempo: '25 min', descripcion: 'Ejercicios prácticos guiados' },
                  { tiempo: '15 min', descripcion: 'Trabajo en equipos colaborativos' },
                  { tiempo: '5 min', descripcion: 'Puesta en común de resultados' }
                ]
              },
              {
                titulo: 'SESIÓN 3 - Evaluación y cierre',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Aplicación de instrumento de evaluación' },
                  { tiempo: '5 min', descripcion: 'Retroalimentación y conclusiones' }
                ]
              }
            ]
          },
          "Contenido 2: Contenido 2 según MEDUCA...": {
            duracion: '2 sesiones de 45 minutos',
            objetivos: [
              'Analizar conceptos intermedios',
              'Resolver problemas prácticos',
              'Desarrollar pensamiento crítico'
            ],
            materiales: [
              'Material de apoyo',
              'Recursos visuales',
              'Guías de trabajo'
            ],
            fases: [
              {
                titulo: 'SESIÓN 1 - Fundamentos y aplicación',
                actividades: [
                  { tiempo: '15 min', descripcion: 'Introducción teórica' },
                  { tiempo: '25 min', descripcion: 'Ejercicios prácticos' },
                  { tiempo: '5 min', descripcion: 'Cierre y preparación' }
                ]
              },
              {
                titulo: 'SESIÓN 2 - Profundización práctica',
                actividades: [
                  { tiempo: '30 min', descripcion: 'Actividad integradora' },
                  { tiempo: '10 min', descripcion: 'Evaluación formativa' },
                  { tiempo: '5 min', descripcion: 'Reflexión final' }
                ]
              }
            ]
          }
        }
      };
    }
    
    console.log('📦 Plan trimestral generado exitosamente');

    res.json({
      ...planContenido,
      generadoPorIA: true,
      fechaGeneracion: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en generate-plan:', error);
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return res.status(503).json({ 
        error: 'Error de conexión con el servicio. Por favor verifica tu internet e intenta nuevamente.',
        tipo: 'network_error',
        codigo: 'NETWORK_ERROR'
      });
    } else {
      return res.status(500).json({ 
        error: 'Error inesperado al generar el plan. Por favor intenta nuevamente.',
        tipo: 'server_error', 
        codigo: 'UNKNOWN_ERROR'
      });
    }
  }
});

// ✅ ENDPOINT CORREGIDO - AHORA ACEPTA FORM DATA
app.post('/api/export-to-drive', upload.single('file'), async (req, res) => {
  try {
    console.log('📨 Solicitud de exportación a Google Drive recibida');
    
    // Obtener datos del FormData
    const file = req.file;
    const { filename, mimeType, format } = req.body;

    console.log('📦 Datos recibidos:', {
      tieneArchivo: !!file,
      filename,
      mimeType,
      format,
      tamañoArchivo: file ? file.size + ' bytes' : 'No aplica'
    });

    // Validar que tenemos un archivo
    if (!file) {
      return res.status(400).json({
        error: 'Se requiere un archivo para subir a Google Drive',
        success: false
      });
    }

    const drive = configureGoogleDrive();
    if (!drive) {
      return res.status(503).json({
        error: 'Google Drive no está configurado en el servidor',
        success: false,
        codigo: 'DRIVE_NOT_CONFIGURED'
      });
    }

    // Usar el nombre del archivo del FormData o generar uno
    const finalFileName = filename || file.originalname || `archivo_${Date.now()}`;
    const finalMimeType = mimeType || file.mimetype;

    console.log('🚀 Subiendo a Google Drive:', {
      fileName: finalFileName,
      mimeType: finalMimeType,
      size: file.size
    });

    // Subir a Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        mimeType: finalMimeType,
        description: `Exportado desde Bringo Edu - ${format || 'archivo'}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root']
      },
      media: {
        mimeType: finalMimeType,
        body: require('stream').Readable.from(file.buffer)
      },
      fields: 'id, name, webViewLink, webContentLink'
    });

    console.log('✅ Archivo subido exitosamente a Google Drive:', response.data.name);

    res.json({
      success: true,
      message: 'Archivo subido exitosamente a Google Drive',
      fileId: response.data.id,
      fileName: response.data.name,
      fileUrl: response.data.webViewLink,
      downloadUrl: response.data.webContentLink,
      format: format
    });

  } catch (error) {
    console.error('❌ Error subiendo a Google Drive:', error);
    
    res.status(500).json({
      error: 'Error al subir archivo a Google Drive: ' + error.message,
      success: false,
      codigo: 'DRIVE_UPLOAD_ERROR'
    });
  }
});

// Endpoint para subir archivos a Google Drive (mantenido por compatibilidad)
app.post('/api/upload-to-drive', upload.single('archivo'), async (req, res) => {
  try {
    console.log('📨 Solicitud de subida a Google Drive recibida (legacy endpoint)');

    const { tipo, nombreArchivo, datos } = req.body;
    const archivo = req.file;

    // Validar que tenemos datos o archivo
    if (!archivo && !datos) {
      return res.status(400).json({
        error: 'Se requieren datos o un archivo para subir',
        success: false
      });
    }

    const drive = configureGoogleDrive();
    if (!drive) {
      return res.status(503).json({
        error: 'Google Drive no está configurado en el servidor',
        success: false,
        codigo: 'DRIVE_NOT_CONFIGURED'
      });
    }

    let fileContent, mimeType, finalFileName;

    if (archivo) {
      // Subir archivo directamente desde buffer
      fileContent = require('stream').Readable.from(archivo.buffer);
      mimeType = archivo.mimetype;
      finalFileName = archivo.originalname;
    } else {
      // Crear archivo desde datos JSON
      const contenido = JSON.stringify(datos, null, 2);
      finalFileName = `${nombreArchivo || 'datos_exportados'}.json`;
      mimeType = 'application/json';
      fileContent = require('stream').Readable.from(Buffer.from(contenido));
    }

    // Subir a Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        mimeType: mimeType,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root']
      },
      media: {
        mimeType: mimeType,
        body: fileContent
      },
      fields: 'id, name, webViewLink, webContentLink'
    });

    console.log('✅ Archivo subido a Google Drive:', response.data.name);

    res.json({
      success: true,
      message: 'Archivo subido exitosamente a Google Drive',
      fileId: response.data.id,
      fileName: response.data.name,
      fileUrl: response.data.webViewLink,
      downloadUrl: response.data.webContentLink
    });

  } catch (error) {
    console.error('❌ Error subiendo a Google Drive:', error);

    res.status(500).json({
      error: 'Error al subir archivo a Google Drive: ' + error.message,
      success: false,
      codigo: 'DRIVE_UPLOAD_ERROR'
    });
  }
});

// Endpoint para verificar configuración de Google Drive
app.get('/api/drive-status', (req, res) => {
  const drive = configureGoogleDrive();
  
  res.json({
    drive_configured: !!drive,
    service_account: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    folder_id: process.env.GOOGLE_DRIVE_FOLDER_ID || 'root',
    features: ['upload', 'export']
  });
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '✅ Backend funcionando correctamente',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: ['openai-plans', 'google-drive-export']
  });
});

// Health check mejorado
app.get('/api/health', (req, res) => {
  const driveStatus = configureGoogleDrive();
  
  res.json({
    status: 'healthy',
    service: 'Bringo Edu Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    openai_configured: !!process.env.OPENAI_API_KEY,
    google_drive_configured: !!driveStatus,
    features: ['planes_trimestrales', 'google_drive_export']
  });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'GET /', 
      'GET /api/test', 
      'GET /api/health',
      'GET /api/drive-status',
      'POST /api/generate-plan',
      'POST /api/upload-to-drive', 
      'POST /api/export-to-drive'
    ]
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('💥 Error global:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: error.message,
    codigo: 'INTERNAL_SERVER_ERROR'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📍 Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`📍 Drive status: http://localhost:${PORT}/api/drive-status`);
  console.log(`📍 Generate plan: http://localhost:${PORT}/api/generate-plan`);
});
