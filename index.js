const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const log4js = require('log4js');
const mysql = require('mysql2');
const crypto = require('crypto-js');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('html', require('ejs').renderFile);

// Connexion à la base de données MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Remplace par ton mot de passe MySQL
    database: 'pirate' // Remplace par le nom de ta base de données
});

connection.connect((err) => {
    if (err) {
        logger.error('Erreur de connexion à la base de données :', err);
        return;
    }
    logger.info('Connecté à la base de données MySQL');
});


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

app.post('/search', (req, res) => {
    const inputHash = req.body.hash;

    // Requête SQL pour récupérer le mot de passe associé aux différents types de hash
    const sql = 'SELECT password FROM passwords WHERE md5 = ? OR sha1 = ? OR sha256 = ?';
    connection.query(sql, [inputHash, inputHash, inputHash], (err, results) => {
        if (err) {
            console.error('Erreur lors de la recherche dans la base de données :', err);
            res.send("Erreur lors de la recherche dans la base de données.");
            return;
        }

        if (results.length > 0) {
            const password = results[0].password; // Récupère le mot de passe correspondant
            logger.info('Mot de passe correspondant trouvé : ' + password);
            const htmlPath = __dirname + '/public/result.html';
            res.render(htmlPath, { password: password });
        } else {
            logger.info('Aucun mot de passe correspondant trouvé pour le hash : ' + inputHash);
            const htmlPath = __dirname + '/public/noresult.html';
            res.render(htmlPath);
        }
    });
});

// Route pour générer et insérer les mots de passe hashés dans la base de données
app.post('/generate', (req, res) => {
    fs.readFile('passwords.json', 'utf8', (err, data) => {
        if (err) {
            logger.error('Erreur lors de la lecture du fichier JSON :', err);
            res.send('Erreur lors de la lecture du fichier JSON.');
            return;
        }

        const passwords = JSON.parse(data).passwords;
        logger.info('Mots de passe chargés depuis le fichier JSON.');

        for (const pass in passwords) {
            const md5Hash = crypto.MD5(passwords[pass]).toString();
            const sha1Hash = crypto.SHA1(passwords[pass]).toString();
            const sha256Hash = crypto.SHA256(passwords[pass]).toString();

            const sql = 'INSERT INTO passwords (password, md5, sha1, sha256) VALUES (?, ?, ?, ?)';
            connection.query(sql, [passwords[pass], md5Hash, sha1Hash, sha256Hash], (err, results) => {
                if (err) {
                    logger.error('Erreur lors de l\'insertion en base de données :', err);
                }
            });
        }

        res.send('Mots de passe hashés et insérés en base de données.');
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    logger.info(`Serveur lancé sur le port ${PORT}`);
});