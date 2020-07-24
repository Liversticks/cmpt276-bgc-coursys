//passport.js
//adapted from https://github.com/DayOnePl/dos-server/blob/master/config/passport.js
//Implements passport local strategy (authentication: checks if email and password match stored values)

const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;

module.exports = (passport, database) => {
  passport.use(new LocalStrategy({
    //make sure names are consistent
    usernameField: 'uname',
    passwordField: 'pwd'
  }, (email, password, callback) => {
    database.query('SELECT id, email, password, type, approved FROM users WHERE email=$1;', [email], (err, dbres) => {
      if (err) {
        console.log("Database error: login-related");
        return callback(err);
      }
      if (dbres.rows.length > 0) {
        const resultRow = dbres.rows[0];
        //console.log(resultRow);
        //check to see whether user-entered password matches stored (hashed) password
        bcrypt.compare(password, resultRow.password, function(err, hashres) {
          if (hashres) {
            callback(null, { id: resultRow.id, email: resultRow.email, type: resultRow.type, approved: resultRow.approved});
          } else {
            callback(null, false, { message: "Authentication error: incorrect email or password." });
          }
        })
      } else {
        callback(null, false, { message: "Authentication error: incorrect email or password." });
      }
    });
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, callback) => {
    database.query('SELECT id, email, type FROM users WHERE id=$1;', [parseInt(id, 10)], (err, result) => {
      if (err) {
        console.log("Error on selecting user on session deserialize");
        return callback(err);
      }
      callback(null, result.rows[0]);
    })
  });
}
