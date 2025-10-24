# 🎓 Bringo Edu - Backend

Backend para la aplicación Bringo Edu que integra OpenAI para generar planes de clase alineados con el currículo MEDUCA de Panamá.

## 🚀 Características

- Generación de planes de clase con IA
- Alineado con currículo MEDUCA Panamá
- API RESTful
- CORS habilitado
- Manejo de errores robusto

## 📋 Endpoints

- `GET /` - Health check
- `GET /api/test` - Prueba del servidor
- `POST /api/generate-plan` - Generar plan de clase

## 🛠️ Instalación

1. Clonar repositorio
2. `npm install`
3. Configurar variables de entorno en `.env`
4. `npm start`

## 🔧 Variables de Entorno

Ver `.env.example` para la configuración requerida.

## 📝 Uso

```bash
# Desarrollo
npm run dev

# Producción
npm start