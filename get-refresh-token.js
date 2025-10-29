const { google } = require('googleapis');

// 🔑 REEMPLAZA CON TUS CREDENCIALES REALES
const CLIENT_ID = "667720262345-0glb797o2bk786k8v88un6hleda7k3st.apps.googleusercontent.com","project_id":"bringoedu","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
const CLIENT_SECRET = "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","redirect_uris":["http://localhost:3000","https://bringo-edu-backend-2.onrender.com"
const REDIRECT_URI = 'https://bringo-edu-backend-2.onrender.com';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent'
});

console.log('🌐 **PASO 1:** Abre esta URL en tu navegador:');
console.log('\n' + authUrl + '\n');
console.log('✅ **PASO 2:** Después de autorizar, copia el código de la URL');
console.log('📝 El código viene después de ?code= en la URL');
console.log('\n🚀 **PASO 3:** Ejecuta:');
console.log('node exchange-code.js TU_CODIGO_AQUI');
