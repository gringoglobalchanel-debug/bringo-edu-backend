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

// Endpoint para generar planes de clase
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
    const { nombreProfesor, institucion, gradoPlan, materia, tema, duracionClase } = req.body;

    console.log('📨 Solicitud recibida:', {
      nombreProfesor, institucion, gradoPlan, materia, tema, duracionClase
    });

    // Validar campos requeridos
    if (!nombreProfesor || !institucion || !gradoPlan || !materia || !tema) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos: nombreProfesor, institucion, gradoPlan, materia, tema' 
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

    const prompt = `Eres un experto en educación panameña y conoces a fondo el currículo del MEDUCA (Ministerio de Educación de Panamá).

Genera un plan de clase detallado y profesional con la siguiente información:
- Profesor: ${nombreProfesor}
- Institución: ${institucion}
- Grado: ${gradoPlan}
- Materia: ${materia}
- Tema: ${tema}
- Duración de la clase: ${duracionClase} minutos

El plan debe estar alineado con el currículo nacional de Panamá (MEDUCA) e incluir:

1. INFORMACIÓN GENERAL
2. OBJETIVOS DE APRENDIZAJE (3-4 objetivos)
3. COMPETENCIAS A DESARROLLAR (3-5 competencias)
4. INDICADORES DE LOGRO (3-4 indicadores)
5. METODOLOGÍA (inicio, desarrollo, cierre)
6. ACTIVIDADES DETALLADAS (2-4 actividades)
7. RECURSOS Y MATERIALES
8. EVALUACIÓN
9. ADAPTACIONES CURRICULARES
10. TAREA O ACTIVIDAD DE SEGUIMIENTO
11. OBSERVACIONES

Genera el plan en formato JSON con esta estructura exacta:
{
  "profesor": "",
  "institucion": "",
  "grado": "",
  "materia": "",
  "tema": "",
  "duracion": "",
  "fecha": "",
  "objetivos": [],
  "competencias": [],
  "indicadoresLogro": [],
  "metodologia": {
    "inicio": "",
    "desarrollo": "",
    "cierre": ""
  },
  "actividades": [
    {
      "nombre": "",
      "duracion": "",
      "descripcion": "",
      "recursos": [],
      "tipoTrabajo": ""
    }
  ],
  "recursos": [],
  "evaluacion": {
    "diagnostica": "",
    "formativa": "",
    "sumativa": "",
    "instrumentos": []
  },
  "adaptaciones": [],
  "tarea": "",
  "observaciones": ""
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.`;

    console.log('🔄 Enviando solicitud a OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Usar 3.5-turbo que es más económico
        messages: [
          {
            role: 'system',
            content: 'Eres un experto pedagogo especializado en el currículo del MEDUCA de Panamá. Generas planes de clase detallados, profesionales y alineados con el marco curricular panameño. Responde SOLO con JSON válido.'
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
      const errorData = await response.text();
      console.error('❌ Error de OpenAI:', response.status, errorData);
      throw new Error(`Error de OpenAI API: ${response.status}`);
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
    
    const planContenido = JSON.parse(jsonStr);
    
    console.log('📦 Plan generado exitosamente');

    res.json({
      ...planContenido,
      fecha: new Date().toLocaleDateString('es-PA'),
      generadoPorIA: true
    });

  } catch (error) {
    console.error('❌ Error en generate-plan:', error);
    res.status(500).json({ 
      error: 'Error al generar el plan: ' + error.message 
    });
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

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    availableEndpoints: ['GET /', 'GET /api/test', 'POST /api/generate-plan']
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('💥 Error global:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: error.message 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📍 Generate plan: http://localhost:${PORT}/api/generate-plan`);
});