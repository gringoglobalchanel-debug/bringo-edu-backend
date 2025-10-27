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

// Configurar multer para archivos temporales
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Configurar Google Drive API
const configureGoogleDrive = () => {
  try {
    const credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!credentials.client_email || !credentials.private_key) {
      console.warn('⚠️  Google Drive no configurado - faltan credenciales');
      return null;
    }

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/drive.file']
    );

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('❌ Error configurando Google Drive:', error);
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

    const prompt = `Eres un especialista en el Currículo Nacional de Panamá (MEDUCA). Genera un plan de estudios COMPLETO y DETALLADO para el TRIMESTRE específico:

**CONTEXTO:**
- GRADO: ${gradoPlan}
- ASIGNATURA: ${materia} 
- TRIMESTRE: ${trimestre}
- DOCENTE: ${nombreProfesor}
- CENTRO EDUCATIVO: ${institucion}

**INSTRUCCIONES ESPECÍFICAS - GENERA SOLO JSON VÁLIDO:**

**1. ESTRUCTURA OBLIGATORIA DEL JSON:**
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
        "duracion": "3-4 sesiones de 45 minutos (ESPECÍFICA según complejidad)",
        "objetivos_aprendizaje": ["3-4 objetivos medibles y específicos"],
        "materiales_recursos": ["materiales CONCRETOS y específicos para este contenido"],
        "sesiones_detalladas": [
          {
            "titulo": "SESIÓN 1 - Introducción y exploración",
            "actividades": [
              {
                "tiempo": "10 min",
                "descripcion": "ACTIVIDAD CONCRETA: Presentación interactiva del tema usando ejemplos reales"
              },
              {
                "tiempo": "15 min", 
                "descripcion": "ACTIVIDAD CONCRETA: Lluvia de ideas grupal sobre conceptos previos"
              },
              {
                "tiempo": "20 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicio práctico guiado con material concreto"
              }
            ]
          },
          {
            "titulo": "SESIÓN 2 - Desarrollo y aplicación",
            "actividades": [
              {
                "tiempo": "15 min",
                "descripcion": "ACTIVIDAD CONCRETA: Explicación teórica con ejemplos aplicados"
              },
              {
                "tiempo": "25 min",
                "descripcion": "ACTIVIDAD CONCRETA: Trabajo en equipos resolviendo problemas reales"
              },
              {
                "tiempo": "5 min",
                "descripcion": "ACTIVIDAD CONCRETA: Puesta en común de resultados"
              }
            ]
          },
          {
            "titulo": "SESIÓN 3 - Profundización y evaluación",
            "actividades": [
              {
                "tiempo": "20 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicios de mayor complejidad guiados"
              },
              {
                "tiempo": "15 min",
                "descripcion": "ACTIVIDAD CONCRETA: Aplicación de instrumento de evaluación formativa"
              },
              {
                "tiempo": "10 min",
                "descripcion": "ACTIVIDAD CONCRETA: Retroalimentación y conclusiones"
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
            "titulo": "SESIÓN 1 - Fundamentos conceptuales",
            "actividades": [
              {
                "tiempo": "15 min",
                "descripcion": "ACTIVIDAD CONCRETA: Exposición dialogada con apoyo visual"
              },
              {
                "tiempo": "20 min",
                "descripcion": "ACTIVIDAD CONCRETA: Ejercicios de aplicación básica"
              },
              {
                "tiempo": "10 min",
                "descripcion": "ACTIVIDAD CONCRETA: Socialización de aprendizajes"
              }
            ]
          },
          {
            "titulo": "SESIÓN 2 - Práctica integradora", 
            "actividades": [
              {
                "tiempo": "25 min",
                "descripcion": "ACTIVIDAD CONCRETA: Resolución de casos prácticos en equipos"
              },
              {
                "tiempo": "15 min",
                "descripcion": "ACTIVIDAD CONCRETA: Presentación de soluciones"
              },
              {
                "tiempo": "5 min",
                "descripcion": "ACTIVIDAD CONCRETA: Coevaluación entre pares"
              }
            ]
          }
        ]
      }
    },
    "observaciones": "Texto con recomendaciones prácticas para implementación"
  }
}

**2. REQUISITOS ESPECÍFICOS:**

- Los CONTENIDOS deben ser REALES del currículo MEDUCA para ${gradoPlan} ${materia}
- Cada contenido en "desarrollo_clases" debe tener entre 2-4 sesiones REALISTAS
- Las ACTIVIDADES deben ser CONCRETAS, PRÁCTICAS y APLICABLES en aula
- Los MATERIALES deben ser ESPECÍFICOS y disponibles en escuelas panameñas
- Las DURACIONES deben ser REALISTAS (45 minutos por sesión)
- Los OBJETIVOS deben ser MEDIBLES y ESPECÍFICOS

**3. EJEMPLOS DE ACTIVIDADES CONCRETAS:**
- "Los estudiantes identificarán patrones usando fichas de colores"
- "Trabajo en equipos resolviendo problemas del contexto local"
- "Elaboración de mapa conceptual colaborativo"
- "Simulación de situaciones reales aplicando conceptos"

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

// Endpoint para subir archivos a Google Drive
app.post('/api/upload-to-drive', upload.single('archivo'), async (req, res) => {
  try {
    console.log('📨 Solicitud de subida a Google Drive recibida');

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
      // Subir archivo directamente
      fileContent = fs.createReadStream(archivo.path);
      mimeType = archivo.mimetype;
      finalFileName = archivo.originalname;
    } else {
      // Crear archivo desde datos JSON
      const contenido = JSON.stringify(datos, null, 2);
      finalFileName = `${nombreArchivo || 'datos_exportados'}.json`;
      mimeType = 'application/json';
      
      // Crear archivo temporal
      const tempPath = path.join('uploads', finalFileName);
      fs.writeFileSync(tempPath, contenido);
      fileContent = fs.createReadStream(tempPath);
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

    // Limpiar archivos temporales
    if (archivo) {
      fs.unlinkSync(archivo.path);
    }
    if (!archivo && datos) {
      fs.unlinkSync(path.join('uploads', finalFileName));
    }

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
    
    // Limpiar archivos temporales en caso de error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Error al subir archivo a Google Drive: ' + error.message,
      success: false,
      codigo: 'DRIVE_UPLOAD_ERROR'
    });
  }
});

// Endpoint para exportar datos específicos a Google Drive
app.post('/api/export-to-drive', async (req, res) => {
  try {
    const { datos, nombreArchivo, tipo } = req.body;

    console.log('📊 Exportando datos a Google Drive:', { tipo, nombreArchivo });

    if (!datos) {
      return res.status(400).json({
        error: 'Se requieren datos para exportar',
        success: false
      });
    }

    const drive = configureGoogleDrive();
    if (!drive) {
      return res.status(503).json({
        error: 'Google Drive no está configurado',
        success: false,
        codigo: 'DRIVE_NOT_CONFIGURED'
      });
    }

    // Determinar formato y contenido basado en el tipo
    let contenido, mimeType, extension;
    
    switch (tipo) {
      case 'excel':
        contenido = JSON.stringify(datos, null, 2);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = 'xlsx';
        break;
      case 'pdf':
        contenido = `Reporte PDF - ${new Date().toLocaleDateString()}\n\n${JSON.stringify(datos, null, 2)}`;
        mimeType = 'application/pdf';
        extension = 'pdf';
        break;
      case 'word':
        contenido = `Reporte Word - ${new Date().toLocaleDateString()}\n\n${JSON.stringify(datos, null, 2)}`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
        break;
      default:
        contenido = JSON.stringify(datos, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    const finalFileName = `${nombreArchivo || 'exportacion'}.${extension}`;
    const tempPath = path.join('uploads', finalFileName);
    
    fs.writeFileSync(tempPath, contenido);
    const fileContent = fs.createReadStream(tempPath);

    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        mimeType: mimeType,
        description: `Exportado desde Bringo Edu - ${tipo}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root']
      },
      media: {
        mimeType: mimeType,
        body: fileContent
      },
      fields: 'id, name, webViewLink, webContentLink'
    });

    // Limpiar archivo temporal
    fs.unlinkSync(tempPath);

    console.log('✅ Exportación a Google Drive completada');

    res.json({
      success: true,
      message: `Datos exportados a Google Drive como ${extension.toUpperCase()}`,
      fileId: response.data.id,
      fileName: response.data.name,
      fileUrl: response.data.webViewLink,
      tipo: tipo
    });

  } catch (error) {
    console.error('❌ Error en export-to-drive:', error);
    res.status(500).json({
      error: 'Error al exportar a Google Drive: ' + error.message,
      success: false
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

// Crear directorio uploads si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📍 Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`📍 Drive status: http://localhost:${PORT}/api/drive-status`);
  console.log(`📍 Generate plan: http://localhost:${PORT}/api/generate-plan`);
});
