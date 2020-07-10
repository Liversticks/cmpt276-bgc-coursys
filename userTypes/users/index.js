//index.js
//Handles implementations of all user paths
//NOTE: this may be split into several sub-files as scope increases

const database = require('../../database');

//password storage setup
const bcrypt = require('bcrypt');
const saltRounds = 10;


module.exports = {

  //all login cases
  //if logged in (or submit valid login credentials), redirect to appropriate landing page
  //otherwise, render login page
  login: (request, result) => {
    if (request.user) {
      if (request.user.type === 'attendee') {
        return result.redirect('/main');
      } else if (request.user.type === 'organizer') {
        return result.redirect('/organizer/main');
      }
    }
    result.render('pages/login');
	},

  //NOTE: dummy data (will code database storage later)
  landing: async (request, result) => {
    let queryCourse = `
    SELECT id, course_name, topic, location,start_date,end_date,
            seat_capacity
    FROM courses
    WHERE start_date >= CURRENT_DATE;
    `;
    
    try {
      var data = [];

      database.query(queryCourse, (errOutDB, dbRes) => {
        if (errOutDB) {
          result.send("Error querying db on landing/main");
        } else {
          var dateFormat = {hour:'numeric', minute: 'numeric', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
          for (var row=0; row < dbRes.rows.length; row++) {
            let startDate = new Date(dbRes.rows[row].start_date);
            data.push(
              {
                  title: dbRes.rows[row].course_name,
                  topic: dbRes.rows[row].topic,
                  delivery: dbRes.rows[row].location,
                  time: startDate.toLocaleString("en-US", dateFormat),
                  seats: '?',
                  maxSeats: dbRes.rows[row].seat_capacity,
                  status: "N/A"
              }
            );
          }
          console.log(data);
          result.render('pages/index', { data: data });
        }
      });
    } catch (err) {
      result.send("Error");
    }
    
  },

  logout: (request, result, next) => {
    request.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      request.logout();
      result.sendStatus(200);
    });
  },

  //render signup page
  signup: (request, result) => {
    result.render('pages/signUp');
  },

  //create new account from email + password
  createAccount: (request, result) => {
    //do regular expression checks
    let emailRegex = /[^(@|\s)]+@bgcengineering.ca/;
    let mainPassRegex = /[\w|\~|\`|\!|\@|\#|\$|\%|\^|\*|\(|\)|\-|\{|\}|\[|\]|\'|\,|\.|\/|\\|:]{8,}/;
    let uppercaseRegex = /[A-Z]/g;
    let lowercaseRegex = /[a-z]/g;
    let numberRegex = /[0-9]/g;


    let email = request.body.uname.match(emailRegex);
    let password = request.body.pwd.match(mainPassRegex);

    //other password checks
    let uppercase = request.body.pwd.match(uppercaseRegex);
    let lowercase = request.body.pwd.match(lowercaseRegex);
    let number = request.body.pwd.match(numberRegex);

    if (email === null) {
      return result.json("Invalid email, try again.");
    }
    if (password === null || uppercase === null || lowercase === null || number === null) {
      return result.json("Invalid password, try again.");
    }
    //check to see if user is already in database
    database.query('SELECT email FROM users WHERE email=$1;', email, (errOutDB, dbRes) => {
      if (errOutDB) {
        return result.json("Database error - looking up existing email");
      }
      if (dbRes.rows.length > 0) {
        return result.json("Email already exists in database");
      }
      else {
        //create new password
        bcrypt.hash(password[0], saltRounds, (errHash, hash) => {
          if (errHash) {
            return result.json("Could not hash password properly");
          }
          console.log(email[0] + " " + hash);
          database.query('INSERT INTO users (email, password, type) VALUES ($1, $2, $3);', [email[0], hash, "attendee"], (errInDB, dbRes2) => {
            if (errInDB) {
              return result.json("Database error - could not insert");
            }
            return result.json("Successfully inserted");
          });
        });
      }
    })




  }

}
