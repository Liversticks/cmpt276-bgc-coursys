//index.js
//Handles implementations of all course paths
//NOTE: this may be split into several sub-files as scope increases

const database = require('../../database');
const sgMail = require('@sendgrid/mail');



module.exports = {
  //display login
  renderNewCourse: (request, result) => {
    result.render('pages/newCourse', {
      id: "",
      title: "",
      topic: "",
      location: "",
      description: "",
      sessionNum: 1,
      sessions: [{ name: "", start: "", end: "", date: "" }],
      deadline: "",
      seats: "",
    });
  },

  submitNewCourse: (req, res) => {
    let insertQuery = `
      INSERT INTO courses (course_name, topic, location, sessions, seat_capacity, course_deadline, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
      `;

    //verify that deadline time is valid
    console.log(req.body.deadline + " " + req.body.deadTime);

    //use returning from first query to get the ID for the session insert
    let insertObject = [
      req.body.coursename,
      req.body.topic,
      req.body.location,
      req.body.sessionTracker,
      req.body.capacity,
      (req.body.deadline + ' ' + req.body.deadTime),
      req.body.description

    ];
    //console.log(insertQuery);
    database.query(insertQuery, insertObject, (errOutDB, dbRes) => {
      if (errOutDB) {
        return result.json("Database error - inserting course");
      } else {
        //gather number of sessions
        let numSessions = parseInt(req.body.sessionTracker, 10);
        let insertSession = [];

        //construct query
        let insertSessionQuery = 'INSERT INTO course_sessions (course_id, session_start, session_end, session_name) VALUES\n';
        for (let i = 1; i <= numSessions; i++) {
          insertSessionQuery += '(';
          insertSession.push(dbRes.rows[0].id);
          insertSession.push(req.body['sessionDate' + i] + ' ' + req.body['startTime' + i]);
          insertSession.push(req.body['sessionDate' + i] + ' ' + req.body['endTime' + i]);
          insertSession.push(req.body['sessionName' + i]);
          insertSessionQuery += `$${(i - 1) * 4 + 1}, $${(i - 1) * 4 + 2}, $${(i - 1) * 4 + 3}, $${(i - 1) * 4 + 4})`
          if (i < numSessions) {
            insertSessionQuery += ',\n';
          }

        }
        insertSessionQuery += ';'
        database.query(insertSessionQuery, insertSession, (errOutDB1, dbRes1) => {
          if (errOutDB1) {
            return res.json("Database error - inserting course sessions");
          }
          return res.redirect('/organizer/main');
        });
      }
    });
  },

  viewCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    //retrieve name, topic, location, max capacity, current seats, description, session times
    let getCourse = `
        SELECT courses.course_name, courses.topic, courses.location, courses.sessions, courses.seat_capacity,
        courses.description, course_sessions.session_start, course_sessions.session_end, course_sessions.session_name
        FROM courses, course_sessions
        WHERE courses.id = course_sessions.course_id
        AND courses.id=$1;
        `;
    let isEnrolledQuery = `
        SELECT * FROM enrollment WHERE course_id = ${courseID} AND user_id=${req.user.id};
        `
    database.query(isEnrolledQuery, (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - viewing courses");
      }
      if (dbRes.rows.length > 0) {
        //only 1 query needed
        //Can be case where there is no course_sessions -> will need to check
        let dateFormat = {
          hour: 'numeric',
          minute: 'numeric',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        };
        let formattedDates = dbRes.rows.map((oldRow) => {
          let newStart = new Date(oldRow.session_start);
          let newFinish = new Date(oldRow.session_end);
          return {
            session_start: newStart.toLocaleString("en-US", dateFormat),
            session_end: newFinish.toLocaleString("en-US", dateFormat),
            session_name: oldRow.session_name,
          };
        });
        let inputObject = {
          isOrganizer: isOrganizer,
          title: dbRes.rows[0]['course_name'],
          topic: dbRes.rows[0]['topic'],
          location: dbRes.rows[0]['location'],
          description: dbRes.rows[0]['description'],
          sessionNum: dbRes.rows[0]['sessions'],
          sessions: formattedDates,
          seats: dbRes.rows[0]['seat_capacity'],
          id: courseID
        }

        return res.render('pages/viewCourse', inputObject);
      } else {
        let isEnrolled = dbRes.rows.length > 0  ? true : false;
        console.log(isEnrolled);
        console.log(dbRes.rows);
        let isOrganizer = (req.user.type === 'organizer');
        database.query(getCourse, [courseID], (dbErr, dbRes) => {
          if (dbErr) {
            return res.json("Database error - viewing courses");
          }
          if (dbRes.rows.length > 0) {
            //only 1 query needed
            //Can be case where there is no course_sessions -> will need to check
            let dateFormat = {
              hour: 'numeric',
              minute: 'numeric',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            };
            let formattedDates = dbRes.rows.map((oldRow) => {
              let newStart = new Date(oldRow.session_start);
              let newFinish = new Date(oldRow.session_end);
              return {
                session_start: newStart.toLocaleString("en-US", dateFormat),
                session_end: newFinish.toLocaleString("en-US", dateFormat)
              };
            });
            let inputObject = {
              isEnrolled: isEnrolled,
              isOrganizer: isOrganizer,
              title: dbRes.rows[0]['course_name'],
              topic: dbRes.rows[0]['topic'],
              location: dbRes.rows[0]['location'],
              description: dbRes.rows[0]['description'],
              sessionNum: dbRes.rows[0]['sessions'],
              sessions: formattedDates,
              seats: dbRes.rows[0]['seat_capacity'],
              id: courseID
            }

            return res.render('pages/viewCourse', inputObject);
          } else {
            return res.json("Could not retrieve course records");
          }
        });
      }
    });
    

  },
  enrollCourse: (req, res) => {
    //TODO: check whether user is already enrolled to prevent double enrollment
    let courseID = parseInt(req.params.id, 10);
    let userID = req.user.id;
    let userPosition = 0;

    let courseCapacity = 0;
    // get course capacity
    let getCourseCapacity = 'SELECT seat_capacity FROM courses WHERE id = $1';
    database.query(getCourseCapacity, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - retrieving capacity info");
      }
      if (dbRes.rows.length > 0) {
        courseCapacity = dbRes.rows[0].seat_capacity;
      }
      else {
        return res.json("Could not retrieve course records");
      }
    });
    // update user position
    let getCourseEnrollment = 'SELECT * FROM enrollment WHERE course_id = $1';
    database.query(getCourseEnrollment, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - retrieving enrollment info");
      }
      // find max position
      if (dbRes.rows.length >= courseCapacity) {
        dbRes.rows.forEach((row) => {
          userPosition = (row.position > userPosition) ? row.position : userPosition;
        });
        userPosition++;
      }
    });

    // enrolling user into course
    let insertCourseEnrollment = `
        INSERT INTO enrollment (course_id, user_id, time) VALUES ($1, $2, CURRENT_TIMESTAMP);
        `;
    console.log(courseID + " " + userID);
    database.query(insertCourseEnrollment, [courseID, userID], (dbErr, dbRes) => {
      if (dbErr) {
        console.log(dbErr);
        let errorBlock = {
          redirect: '/main',
          message: 'You are already enrolled (or there is some nasty primary key desync).',
          target: 'the main page'
        };
        return res.render("pages/redirect", errorBlock);
      } else {
        //redirect to message + main
        //res.redirect('/courses/' + courseID);
        let backToMain = {
          redirect: '/main',
          message: 'Course enrolled successfully!',
          target: 'the main page'
        };
        res.render('pages/redirect', backToMain);
      }
    });
  },
  withdrawlCourse: async (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let userID = req.user.id;
    let userPosition = 0;

    let courseCapacity = 0;
    let numEnrolled = 0;
    // get course capacity
    let getCourseCapacity = 'SELECT seat_capacity FROM courses WHERE id = $1';
    database.query(getCourseCapacity, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - retrieving capacity info");
      }
      if (dbRes.rows.length > 0) {
        courseCapacity = dbRes.rows[0].seat_capacity;
      }
      else {
        return res.json("Could not retrieve course records");
      }
    });
    // update user position
    let getCourseEnrollment = 'SELECT * FROM enrollment WHERE course_id = $1 ORDER BY time ASC';
    database.query(getCourseEnrollment, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - retrieving enrollment info");
      }
      // find max position
      numEnrolled = dbRes.rows.length;
      if (numEnrolled >= courseCapacity) {
        dbRes.rows.forEach((row) => {
          userPosition = (row.position > userPosition) ? row.position : userPosition;
        });
        userPosition++;
      }
    });

    // withdrawl user from course
    let removeCourseEnrollment = `
        DELETE FROM enrollment WHERE user_id=${req.user.id} AND course_id=${courseID};
        `;
    console.log(courseID + " " + userID);
    database.query(removeCourseEnrollment, (dbErr, dbRes) => {
      if (dbErr) {
        console.log(dbErr);
        return res.json("Database error - withdrawing course");
      } else {
        if (numEnrolled-1 >= courseCapacity && userPosition <= courseCapacity) {
          // email next user
          let getNewEnrolled = `SELECT e.*, c.course_name, u.email FROM enrollment e, courses c, users u 
                                WHERE e.course_id = ${courseID} AND e.course_id = c.id AND u.id=e.user_id
                                ORDER BY e.time ASC;`;
          database.query(getNewEnrolled, (dbErr, dbRes) => {
            if (dbErr) {
              return res.json('Database error - getting next in line');
            } else {
              let nextInLine = dbRes.rows[courseCapacity-1];
              sgMail.setApiKey(process.env.SENDGRID_API_KEY);
              const msg = {
                to: nextInLine.email,
                from: 'mla283@sfu.ca',
                subject: `BGC Coursys: You have been enrolled in the ${nextInLine.course_name}`,
                text: `You have been moved from the waitlist and enrolled in ${nextInLine.course_name}

                    To view more details visit cmpt276-bgc-coursys.herokuapp.com/courses/${nextInLine.course_id}`,
                html: `You have been moved from the waitlist and enrolled in ${nextInLine.course_name}
                    <br><br>
                    To view more details visit
                    <a target="_blank" href="https://cmpt276-bgc-coursys.herokuapp.com/courses/${nextInLine.course_id}">
                    cmpt276-bgc-coursys.herokuapp.com/courses/${nextInLine.course_id}</a>`,
                };
              
              // console.log(nextInLine.email);
              console.log(sgMail.send(msg));


            }
          });
        }
        res.redirect('/courses/' + courseID);
      }
    });
  },
  renderEditCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let getCourseDetails = `
    SELECT courses.course_name, courses.topic, courses.location, courses.sessions, courses.seat_capacity,
    courses.description, courses.course_deadline, course_sessions.session_start, course_sessions.session_end, course_sessions.session_name
    FROM courses, course_sessions
    WHERE courses.id = course_sessions.course_id
    AND courses.id=$1;
    `;
    //24 hr time format
    //example: 23:59:00
    let timeFormat = /(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/g;

    database.query(getCourseDetails, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json('Database error - getting course details for editing');
      }
      if (dbRes.rows.length > 0) {
        //need to split items into date, start_time, end_time
        let formattedDates = dbRes.rows.map((oldRow) => {
          let startSess = new Date(oldRow.session_start);
          let endSess = new Date(oldRow.session_end);
          return {
            date: startSess.toISOString().split('T')[0],
            start: startSess.toTimeString().match(timeFormat)[0],
            end: endSess.toTimeString().match(timeFormat)[0],
            name: oldRow.session_name,
          };
        });

        let deadlineParts = new Date(dbRes.rows[0]['course_deadline']);
        let deadline = {
          date: deadlineParts.toISOString().split('T')[0],
          time: deadlineParts.toTimeString().match(timeFormat)[0]
        }

        let inputObject = {
          id: courseID,
          title: dbRes.rows[0]['course_name'],
          topic: dbRes.rows[0]['topic'],
          location: dbRes.rows[0]['location'],
          description: dbRes.rows[0]['description'],
          sessionNum: dbRes.rows[0]['sessions'],
          sessions: formattedDates,
          deadline: deadline,
          seats: dbRes.rows[0]['seat_capacity'],
        }
        return res.render('pages/editCourse', inputObject);
      } else {
        return res.json("Could not retrieve course records");
      }
    });
  },

  editCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let updateCourseDetails = `
    UPDATE courses
    SET course_name=$1, topic=$2, location=$3, sessions=$4, seat_capacity=$5, description=$6, course_deadline=$7
    WHERE id=$8;
    `;
    let updateCourseContent = [
      req.body.coursename,
      req.body.topic,
      req.body.location,
      req.body.sessionTracker,
      req.body.capacity,
      req.body.description,
      (req.body.deadline + ' ' + req.body.deadTime),
      courseID
    ];
    database.query(updateCourseDetails, updateCourseContent, (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - updating main course details");
      }
      //add session updates here
      //Use session ids
      //Check how many sessions there are
      //If new contains less, remove sessions (starting from greatest ID), update the rest
      //If new contains more,

      //Alternatively, delete sessions matching ID
      //create new ones
      //Intended to be a temporary solution
      let tempDelete = `DELETE FROM course_sessions WHERE course_id=$1;`
      database.query(tempDelete, [courseID], (dbErr1, dbRes1) => {
        if (dbErr1) {
          return res.json("Database error - removing old session details")
        }
        let numSessions = parseInt(req.body.sessionTracker, 10);
        let insertSession = [];

        //construct query
        let insertSessionQuery = 'INSERT INTO course_sessions (course_id, session_start, session_end, session_name) VALUES\n';
        for (let i = 1; i <= numSessions; i++) {
          insertSessionQuery += '(';
          insertSession.push(courseID);
          insertSession.push(req.body['sessionDate' + i] + ' ' + req.body['startTime' + i]);
          insertSession.push(req.body['sessionDate' + i] + ' ' + req.body['endTime' + i]);
          insertSession.push(req.body['sessionName' + i]);
          insertSessionQuery += `$${(i - 1) * 4 + 1}, $${(i - 1) * 4 + 2}, $${(i - 1) * 4 + 3}, $${(i - 1) * 4 + 4})`
          if (i < numSessions) {
            insertSessionQuery += ',\n';
          }

        }
        insertSessionQuery += ';'
        database.query(insertSessionQuery, insertSession, (dbErr2, dbRes2) => {
          if (dbErr2) {
            return res.json("Database error - inserting new session records");
          }
          return res.redirect('/organizer/main');
        })
      })



    })
  },

}
