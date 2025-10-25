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

BASADO EN LOS CONTENIDOS OFICIALES DEL MEDUCA PARA ${gradoPlan} ${materia} EN EL ${trimestre}:

**INFORMACIÓN GENERAL DEL TRIMESTRE:**
- Duración estimada: 10-12 semanas
- Contenidos conceptuales específicos del ${trimestre}
- Competencias a desarrollar según estándares MEDUCA
- Indicadores de logro observables y medibles

**ESTRUCTURA PEDAGÓGICA:**
- Estrategias metodológicas apropiadas para ${gradoPlan}
- Recursos y materiales educativos requeridos
- Instrumentos de evaluación formativa y sumativa
- Adaptaciones curriculares para atención a la diversidad
- Actividades de aprendizaje secuenciadas

**ALINEACIÓN CURRICULAR:**
- Competencias del siglo XXI integradas
- Enfoque por habilidades y valores
- Conexión con proyectos transversales
- Preparación para el siguiente trimestre

IMPORTANTE: Los contenidos deben ser REALES y específicos del currículo MEDUCA para ${gradoPlan} ${materia} en el ${trimestre}.

Responde SOLO con JSON válido, sin texto adicional antes o después.`;

    console.log('🔄 Enviando solicitud a OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // ← MODELO ACTUALIZADO
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
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de OpenAI:', response.status, errorText);
      
      // Manejo mejorado de errores
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
    } catch (parseError) {
      console.error('❌ Error parseando JSON de OpenAI:', parseError);
      // Fallback básico
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
        observaciones: 'Plan generado automáticamente basado en currículo MEDUCA'
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
    
    // Manejo mejorado de errores generales
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
