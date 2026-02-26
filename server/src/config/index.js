const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  speedsms: {
    apiToken: process.env.SPEEDSMS_API_TOKEN,
  },

  tingting: {
    apiKey: process.env.TINGTING_API_KEY,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // Cấu hình Hyperledger Fabric Blockchain
  blockchain: {
    enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
    channel: process.env.FABRIC_CHANNEL || 'mychannel',
    chaincode: process.env.FABRIC_CHAINCODE || 'p2plending',
    connectionProfile: process.env.FABRIC_CONNECTION_PROFILE,
    walletPath: process.env.FABRIC_WALLET_PATH,
    identity: process.env.FABRIC_IDENTITY || 'admin',
    asLocalhost: process.env.FABRIC_AS_LOCALHOST === 'true',
  },
};

