var mysql = require('mysql');
var connection = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : 'root',
    database : 'edgysketch'
});

function getWordSet(wordSetReq, cb) {

    var words = new Array();
    connection.connect();
    connection.query('SELECT value from wordbank where wordbank.wordSet = ?', [wordSetReq], function (err, rows, fields) {
        if (!err) {
            var i;
            for (i = 0; i < 5; i++) {
                words[words.length] = rows[i];
            }            
        } else {
            console.log('Error while performing Query.');
        }
        cb(err, words);
    });

    connection.end();
}

exports.getWordSet = getWordSet;
