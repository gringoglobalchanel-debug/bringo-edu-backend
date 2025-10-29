const { google } = require('googleapis');

const CLIENT_ID = 'tu-client-id-real.apps.googleusercontent.com';
const CLIENT_SECRET = 'GOCSPX-tu-client-secret-real';
const REDIRECT_URI = 'https://bringo-edu-backend-2.onrender.com';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const code = process.argv[2];

if (!code) {
  console.error('❌ Proporciona el código como argumento: node exchange-code.js TU_CODIGO');
  process.exit(1);
}

async function getTokens() {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ **TOKENS OBTENIDOS:**');
    console.log('🔑 ACCESS_TOKEN:', tokens.access_token);
    console.log('🔄 REFRESH_TOKEN:', tokens.refresh_token);
    console.log('⏰ EXPIRY_DATE:', tokens.expiry_date);
    
    console.log('\n🎯 **AGREGA ESTA VARIABLE A RENDER:**');
    console.log('GOOGLE_REFRESH_TOKEN = ' + tokens.refresh_token);
    
  } catch (error) {
    console.error('❌ Error obteniendo tokens:', error);
  }
}

getTokens();
