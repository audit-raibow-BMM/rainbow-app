const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const log4js = require('log4js');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('html', require('ejs').renderFile);


const logger = log4js.getLogger();
log4js.configure({
    appenders: { file: { type: 'file', filename: 'logs.log' } },
    categories: { default: { appenders: ['file'], level: 'info' } }
});

let passwords = {};

// Charger les mots de passe à partir du fichier JSON
fs.readFile('passwords.json', 'utf8', (err, data) => {
    if (err) {
        logger.error('Erreur lors de la lecture du fichier JSON :', err);
        return;
    }

    passwords = JSON.parse(data).passwords;
    logger.info('Mots de passe chargés depuis le fichier JSON.');
});

// Route pour afficher la page HTML avec le formulaire
app.get('/', (req, res) => {
    logger.info('Utilisateur sur le formulaire');
    res.sendFile(__dirname + '/public/index.html');
});

// Route pour rechercher un mot de passe correspondant à un hash
app.post('/search', (req, res) => {
    const inputHash = req.body.hash;
    
    let found = false;
    let password = "";

    // Recherche du hash dans la liste des hashs de mots de passe
    for (const pass in passwords) {
        if (passwords[pass] === inputHash) {
            found = true;
            password = pass;
            break;
        }
    }

    // Renvoie du résultat
    if (found) {
        const htmlPath = __dirname + '/public/result.html';
        logger.info('Mot de passe correspondant trouvé : ' + password);
        res.render(htmlPath, {password:password});
    } else {
        const htmlPath = __dirname + '/public/noresult.html';
        logger.info('Aucun mot de passe correspondant trouvé pour le hash : ' + inputHash);
        res.render(htmlPath);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    logger.info(`Serveur lancé sur le port ${PORT}`);
});