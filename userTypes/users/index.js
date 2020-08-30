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
      //console.log(request.user.approved);
      if (request.user.approved === false) {
        return result.render('pages/login', {errors: ["Please wait to be approved by an administrator"]});
      }
      if (request.user.type) {
        return result.redirect('/main');
      }
    }
    return result.render('pages/login', {errors: []});
	},

  loginFail: (request, result) => {
    return result.render('pages/login', {errors: ["Authentication error (incorrect email or password)."]});
  },


  //NOTE: dummy data (will code database storage later)
  landing: async (request, result) => {
    let isOrganizer = request.user.type === 'organizer' ? true: false;

    /*
    let queryCourse = `
    SELECT id, course_name, topic, location, sessions, course_deadline,
            seat_capacity, enabled, count(e.user_id) AS seats
    FROM courses
    LEFT JOIN enrollment e ON e.course_id = id
    WHERE course_deadline >= CURRENT_DATE AND enabled=true
    GROUP BY id
    ORDER BY course_deadline ASC;
    `;
    */
    let queryCourse = `
    SELECT
    id, course_name, topic, location, sessions, course_deadline,
    seat_capacity, enabled, count(distinct e.user_id) AS seats, min(cs.session_start) AS next_sess,
    STRING_AGG(t.tag, ', ') AS tagstring
    FROM courses
    LEFT JOIN enrollment e ON e.course_id = id
    LEFT JOIN course_sessions cs ON cs.course_id = id
    LEFT JOIN tags t ON t.course_id = id
    WHERE course_deadline >= CURRENT_DATE AND enabled=true AND cs.session_start >= CURRENT_TIMESTAMP
    GROUP BY id
    ORDER BY course_deadline ASC;`

    let queryPosition = `
    SELECT course_id, COUNT(e2.user_id) AS position FROM enrollment e2 WHERE e2.course_id IN
    (SELECT course_id FROM enrollment e WHERE e.user_id = $1 AND e2.time<=e.time ORDER BY time ASC)
    GROUP BY course_id;
    `;


    try {
      var data = [];

      database.query(queryCourse, (errOutDB, dbRes) => {
        if (errOutDB) {
          return result.send("Error querying db on landing/main");
        } else {
          console.log(dbRes);
          database.query(queryPosition, [request.user.id], (posError, posRes) => {
            if (posError) {
              return result.send("Error querying position");
            } else {
              var dateFormat = {dateStyle: 'short', timeStyle: 'short'};
              var positionMap = posRes.rows.reduce((map, obj) => {
                map[obj.course_id] = obj.position;
                return map;
              }, {});
              for (var row=0; row < dbRes.rows.length; row++) {
                let deadlineDate = new Date(dbRes.rows[row].course_deadline);
                let nextDate = new Date(dbRes.rows[row].next_sess);
                //console.log(positionMap[dbRes.rows[row].id]);
                data.push(
                  {
                      id: dbRes.rows[row].id,
                      title: dbRes.rows[row].course_name,
                      topic: dbRes.rows[row].topic,
                      delivery: dbRes.rows[row].location,
                      sessions: dbRes.rows[row].sessions,
                      time: deadlineDate.toLocaleString("en-US", dateFormat),
                      nextSession: nextDate.toLocaleString("en-US", dateFormat),
                      position: (positionMap[dbRes.rows[row].id]) ? positionMap[dbRes.rows[row].id] : '?',
                      seats: dbRes.rows[row].seats,
                      maxSeats: dbRes.rows[row].seat_capacity,
                      status: (positionMap[dbRes.rows[row].id]) ? (positionMap[dbRes.rows[row].id] > dbRes.rows[row].seat_capacity) ? "Waitlisted" : "Enrolled" : "Open",
                      tags: dbRes.rows[row].tagstring
                  }
                );
              }
              //console.log(data);
              return result.render('pages/index', { isOrganizer: isOrganizer, data: data });
            }
          });
        }
      });
    } catch (err) {
      return result.send("Error");
    }

  },

  logout: (request, result, next) => {
    request.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      request.logout();
      result.render('pages/redirect', { redirect: '/login', message: 'Logged out successfully!', target: 'the login page'});
    });
  },

  //render signup page
  signup: (request, result) => {
    result.render('pages/signUp', { errors: []});
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

    let errors = [];

    if (email === null) {
      errors.push("Invalid email (must have domain bgcengineering.ca)");
    }
    if (password === null || uppercase === null || lowercase === null || number === null) {
      errors.push("Invalid password, try again.");
    }
    if (errors.length > 0) {
      return result.render('pages/signUp', {errors: errors});
    }
    //check to see if user is already in database
    database.query('SELECT email FROM users WHERE email=$1;', email, (errOutDB, dbRes) => {
      if (errOutDB) {
        return result.json("Database error - looking up existing email");
      }
      if (dbRes.rows.length > 0) {
        return result.render("pages/redirect", { redirect: '/login', message: 'The email you provided already exists. Try logging in with it instead.', target: 'the login page'});
      }
      else {
        //create new password
        bcrypt.hash(password[0], saltRounds, (errHash, hash) => {
          if (errHash) {
            return result.json("Could not hash password properly");
          }
          console.log(email[0] + " " + hash);
          database.query('INSERT INTO users (email, password, type, approved) VALUES ($1, $2, $3, $4);', [email[0], hash, "attendee", "false"], (errInDB, dbRes2) => {
            if (errInDB) {
              return result.json("Database error - could not insert");
            }
            return result.render("pages/redirect", { redirect: '/login', message: 'New account created successfully!', target: 'the login page'});
          });
        });
      }
    })
  },

  getOwnData: (req, res) => {
    let userID = parseInt(req.user.id, 10);
    let isOrganizer = req.user.type === "organizer" ? true : false;
    console.log(userID);

    let userQuery = `SELECT c.id, c.course_name, c.topic, c.location, c.course_deadline,
    c.seat_capacity, min(cs.session_start) AS next_sess
    FROM courses c, enrollment e, course_sessions cs
    WHERE c.id = e.course_id AND c.id = cs.course_id AND e.user_id = $1
    GROUP BY c.id
    ORDER BY c.course_deadline ASC;`

    let queryPosition = `
    SELECT course_id, COUNT(e2.user_id) AS position FROM enrollment e2 WHERE e2.course_id IN
    (SELECT course_id FROM enrollment e WHERE e.user_id = $1 AND e2.time<=e.time ORDER BY time ASC)
    GROUP BY course_id;
    `;

    database.query(userQuery, [userID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - could not retrieve user records");
      } else {
        database.query(queryPosition, [userID], (dbErr2, dbRes2) => {
          if (dbErr2) {
            return res.json("Database error - could not retrieve user positions");
          } else {
            if (dbRes.rows.length != dbRes2.rows.length) {
              return res.json("Database error - enrollment desync");
            } else {
              let inputList = {
                isOrganizer: isOrganizer,
                data: []
              };
              let dateFormat = {dateStyle: 'short', timeStyle: 'short'};
              let current = new Date();
              for (let i = 0; i < dbRes.rows.length; i++) {
                let deadlineDate = new Date(dbRes.rows[i].course_deadline);
                let nextDate = new Date(dbRes.rows[i].next_sess);

                inputList.data.push(
                  {
                    id: dbRes.rows[i].id,
                    title: dbRes.rows[i].course_name,
                    topic: dbRes.rows[i].topic,
                    location: dbRes.rows[i].location,
                    deadline: deadlineDate > current ? deadlineDate.toLocaleString("en-US", dateFormat) : "Passed",
                    nextSess: nextDate > current ? nextDate.toLocaleString("en-US", dateFormat) : "N/A",
                    status: nextDate > current ? dbRes2.rows[i].position > dbRes.rows[i].seat_capacity ? "Waitlisted" : "Enrolled" : "Completed"
                  }
                );
              }
              return res.render("pages/profile", inputList);
            }

          }
        })
      }
    })
  }

}
