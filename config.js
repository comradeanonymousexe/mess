export const CFG = {
  // Firebase Console > Project settings > Your apps > Web app > copy the config values here
  firebase: { 
    apiKey: 'AIzaSyAeJmEZezJt8XXmTFgnifqvbTMiMKTDx9w', 
    authDomain: 'mess-accounting.firebaseapp.com', 
    projectId: 'mess-accounting', 
    appId: '1:92473908036:web:4d112236996aa2c738d511' 
  },

  // Login is "username + pin". Firebase needs an email, so username becomes username@domain.
  domain: 'mess.app',
  admin: 'admin',            // admin username. admin@mess.app must also be written in firestore.rules

  title: 'মেস হিসাব',
  meals: ['দুপুর', 'রাত'],    // meals per day
  reg: 'নিয়মিত',             // regular type label
  irr: 'অনিয়মিত',            // irregular type label
  perMeal: 1,                // meals a regular member gets per meal slot by default
  cur: '৳'
};

