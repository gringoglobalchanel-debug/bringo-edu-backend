const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Bringo Edu Backend funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para generar planes TRIMESTRALES
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

    const prompt = `Eres un especialista en el Currículo Nacional de Panamá (MEDUCA). Genera un plan de estudios COMPLETO para el TRIMESTRE específico solicitado:

- GRADO: ${gradoPlan}
- ASIGNATURA: ${materia}
- TRIMESTRE: ${trimestre}
- DOCENTE: ${nombreProfesor}
- CENTRO EDUCATIVO: ${institucion}

**GENERA UN PLAN COMPLETO SOLO PARA EL ${trimestre}:**

**1. INFORMACIÓN GENERAL DEL TRIMESTRE:**
- Duración estimada: 10-12 semanas
- Contenidos conceptuales específicos del ${trimestre}
- Competencias a desarrollar según estándares MEDUCA
- Indicadores de logro observables y medibles

**2. DESARROLLO DETALLADO DEL CONTENIDO PARA CLASES:**
Para CADA contenido principal, genera un desarrollo pedagógico completo que incluya:
- OBJETIVOS DE APRENDIZAJE específicos y medibles
- MATERIALES Y RECURSOS concretos necesarios
- FASES DE LA ACTIVIDAD con sesiones detalladas (3-4 sesiones por contenido)
- Cada sesión debe incluir: tiempo, actividades específicas, metodología

**3. ESTRUCTURA PEDAGÓGICA:**
- Estrategias metodológicas apropiadas para ${gradoPlan}
- Recursos y materiales educativos requeridos
- Instrumentos de evaluación formativa y sumativa
- Adaptaciones curriculares para atención a la diversidad

**4. ALINEACIÓN CURRICULAR:**
- Competencias del siglo XXI integradas
- Enfoque por habilidades y valores
- Conexión con proyectos transversales

IMPORTANTE: 
- Los contenidos deben ser REALES y específicos del currículo MEDUCA para ${gradoPlan} ${materia} en el ${trimestre}.
- El desarrollo de clases debe ser PRÁCTICO y APLICABLE en el aula.
- Incluir ejemplos concretos y actividades interactivas.

Responde SOLO con JSON válido, sin texto adicional antes o después.`;

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
            content: 'Eres un experto pedagogo especializado en el currículo del MEDUCA de Panamá. Generas planes trimestrales detallados, profesionales y alineados con el marco curricular panameño. Responde SOLO con JSON válido.'
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

      // ✅ NUEVO: PROCESAR DESARROLLO DE CLASES
      if (planContenido.desarrollo_clases) {
        planContenido.desarrolloClases = planContenido.desarrollo_clases;
      } else if (planContenido.desarrollo_detallado_contenido && Array.isArray(planContenido.desarrollo_detallado_contenido)) {
        // Mapear desarrollo_detallado_contenido a desarrolloClases
        planContenido.desarrolloClases = {};
        planContenido.desarrollo_detallado_contenido.forEach((desarrollo, index) => {
          const titulo = desarrollo.titulo_contenido || `Contenido ${index + 1}`;
          planContenido.desarrolloClases[titulo] = {
            duracion: desarrollo.duracion || '3 sesiones de 45 minutos',
            objetivos: desarrollo.objetivos_aprendizaje || [
              'Comprender conceptos fundamentales',
              'Aplicar conocimientos en situaciones prácticas'
            ],
            materiales: desarrollo.materiales_recursos || [
              'Material didáctico impreso',
              'Recursos multimedia'
            ],
            fases: desarrollo.sesiones_detalladas || [
              {
                titulo: 'Introducción',
                actividades: [
                  { tiempo: '15 min', descripcion: 'Presentación del tema' },
                  { tiempo: '30 min', descripcion: 'Desarrollo de actividades' }
                ]
              }
            ]
          };
        });
      } else if (planContenido.contenidos && Array.isArray(planContenido.contenidos)) {
        // Si no viene desarrollo, crear uno básico
        planContenido.desarrolloClases = {};
        planContenido.contenidos.forEach((contenido, index) => {
          planContenido.desarrolloClases[`Contenido ${index + 1}: ${contenido.substring(0, 50)}...`] = {
            duracion: '3 sesiones de 45 minutos',
            objetivos: [
              `Comprender: ${contenido.substring(0, 30)}`,
              'Aplicar conocimientos prácticos',
              'Desarrollar habilidades creativas'
            ],
            materiales: [
              'Material didáctico',
              'Recursos artísticos',
              'Instrumentos de evaluación'
            ],
            fases: [
              {
                titulo: 'Introducción y exploración',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Presentación del tema artístico' },
                  { tiempo: '20 min', descripcion: 'Exploración de conceptos' }
                ]
              },
              {
                titulo: 'Desarrollo creativo',
                actividades: [
                  { tiempo: '30 min', descripcion: 'Actividad práctica creativa' },
                  { tiempo: '10 min', descripcion: 'Compartir resultados' }
                ]
              },
              {
                titulo: 'Reflexión y cierre',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Reflexión grupal' },
                  { tiempo: '5 min', descripcion: 'Conclusiones' }
                ]
              }
            ]
          };
        });
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
        contenidos: ['Contenido 1 según MEDUCA', 'Contenido 2 según MEDUCA'],
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
                titulo: 'Introducción y contextualización',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Presentación del tema y objetivos' },
                  { tiempo: '15 min', descripcion: 'Activación de conocimientos previos' },
                  { tiempo: '20 min', descripcion: 'Exposición teórica interactiva' }
                ]
              },
              {
                titulo: 'Desarrollo y práctica',
                actividades: [
                  { tiempo: '25 min', descripcion: 'Ejercicios prácticos guiados' },
                  { tiempo: '15 min', descripcion: 'Trabajo en equipos colaborativos' },
                  { tiempo: '5 min', descripcion: 'Puesta en común de resultados' }
                ]
              },
              {
                titulo: 'Evaluación y cierre',
                actividades: [
                  { tiempo: '10 min', descripcion: 'Aplicación de instrumento de evaluación' },
                  { tiempo: '5 min', descripcion: 'Retroalimentación y conclusiones' }
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

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '✅ Backend funcionando correctamente',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check mejorado
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Bringo Edu Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    openai_configured: !!process.env.OPENAI_API_KEY,
    features: ['planes_trimestrales']
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
      'POST /api/generate-plan'
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
  console.log(`📍 Generate plan: http://localhost:${PORT}/api/generate-plan`);
});
