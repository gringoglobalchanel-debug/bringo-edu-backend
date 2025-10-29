const { google } = require('googleapis');

const CLIENT_ID = "667720262345-0glb797o2bk786k8v88un6hleda7k3st.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = 'http://localhost:3000';

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
    
    console.log('✅ REFRESH_TOKEN:');
    console.log(tokens.refresh_token);
    
    console.log('\n🎯 Agrega a Render:');
    console.log('GOOGLE_REFRESH_TOKEN = ' + tokens.refresh_token);
    
  } catch (error) {
    console.error('❌ Error obteniendo tokens:', error);
  }
}

getTokens();
