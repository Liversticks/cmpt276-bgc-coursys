//index.js
//Handles implementations of all course paths
//NOTE: this may be split into several sub-files as scope increases

const database = require('../../database');
const sgMail = require('@sendgrid/mail');
const io = require('../../config/io').io();



module.exports = {
  getCourseData:  (req, res) => {
    var courseID = req.params.id;
    var userID = req.user.id;

    let queryCourse = `
    SELECT
    id, course_name, topic, location, sessions, course_deadline,
    seat_capacity, enabled, count(distinct e.user_id) AS seats, min(cs.session_start) AS next_sess
    FROM courses
    LEFT JOIN enrollment e ON e.course_id = id
    LEFT JOIN course_sessions cs ON cs.course_id = id
    WHERE course_deadline >= CURRENT_DATE AND enabled=true AND cs.session_start >= CURRENT_TIMESTAMP
    AND id = $1
    GROUP BY id
    ORDER BY course_deadline ASC;`

    let queryPosition = `
    SELECT course_id, COUNT(e2.user_id) AS position FROM enrollment e2 WHERE e2.course_id IN
  (SELECT course_id FROM enrollment e WHERE e.user_id = $1 AND e2.time<=e.time ORDER BY time ASC) AND e2.course_id=$2
  GROUP BY course_id;
    `;

    console.log(userID + " " + courseID);
    try {
      database.query(queryCourse, [courseID], (err1, dbRes1) => {
        if(err1){
          return res.json("error querying course in course data");
        } else {
          database.query(queryPosition, [userID, courseID], (err2, dbRes2) => {
            if(err2){
              return res.json("error querying position in course data");
            } else {
              let rdlDate = new Date(dbRes1.rows[0].course_deadline);
              let nextDate = new Date(dbRes1.rows[0].next_sess);
              console.log(dbRes2.rows.length);
              console.log(response);
              var response = {
                id: dbRes1.rows[0].id,
                title: dbRes1.rows[0].course_name,
                topic: dbRes1.rows[0].topic,
                delivery: dbRes1.rows[0].location,
                sessions: dbRes1.rows[0].sessions,
                rdeadline: rdlDate.toLocaleString("en-US", {dateStyle: 'short', timeStyle: 'short'}),
                nextSession: nextDate.toLocaleString("en-US", {dateStyle: 'short', timeStyle: 'short'}),
                maxSeats: dbRes1.rows[0].seat_capacity,
                seats: dbRes1.rows[0].seats,
                status: dbRes1.rows[0].enabled ? 'Open' : 'Closed',
                position: dbRes2.rows.length>0 ? dbRes2.rows[0].position : 0,
              }
              res.status(200).json(response);
            }
          });
        }
      });
    } catch(error) {
      return res.status(404).json("error");
    }
  },

  renderNewCourse: (request, result) => {
    let possibleTagsQuery = `SELECT DISTINCT tag FROM tags;`;
    database.query(possibleTagsQuery, (err, res) => {
      if (err) {
        return res.json("Database error - getting available tags");
      } else {
        let allTags = []
        for (row of res.rows) {
          allTags.push(row["tag"]);
        }
        return result.render('pages/newCourse', {
          id: "",
          title: "",
          topic: "",
          location: "",
          description: "",
          sessionNum: 1,
          sessions: [{ name: "", start: "", end: "", date: "" }],
          deadline: { date: "", time: ""},
          seats: "",
          curTags: [],
          allTags: allTags,
          enabled: false,
          editCourse: false
        });
      }
    });

  },

  submitNewCourse: (req, res) => {
    let insertQuery = `
      INSERT INTO courses (course_name, topic, location, sessions, seat_capacity, course_deadline, description, enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
      `;

    //verify that deadline time is valid
    //console.log(req.body.deadline + " " + req.body.deadTime);

    //use returning from first query to get the ID for the session insert
    let insertObject = [
      req.body.coursename,
      req.body.topic,
      req.body.location,
      req.body.sessionTracker,
      req.body.capacity,
      (req.body.deadline + ' ' + req.body.deadTime),
      req.body.description,
      req.body.registration === 'enabled' ? true : false
    ];
    //console.log(insertQuery);
    database.query(insertQuery, insertObject, (errOutDB, dbRes) => {
      if (errOutDB) {
        return result.json("Database error - inserting course");
      } else {
        //gather number of sessions
        let numSessions = parseInt(req.body.sessionTracker, 10);
        let insertSession = [];
        let courseID = dbRes.rows[0].id;

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
        database.query(insertSessionQuery, insertSession, (errOutDB1, dbRes1) => {
          if (errOutDB1) {
            return res.json("Database error - inserting course sessions");
          } else {
            console.log(req.body.tags);
            if (req.body.tags != "") {
              // construct query for tags
              let insertTagsQuery = `INSERT INTO tags (course_id, tag) VALUES `;
              let tags = (req.body.tags).split(',')
              for (tag of tags) {
                insertTagsQuery += `(${courseID}, '${tag}'), `
              }
              insertTagsQuery = insertTagsQuery.substring(0, insertTagsQuery.length-2);
              insertTagsQuery += ';'
              console.log("Tags");
              console.log(insertTagsQuery);

              database.query(insertTagsQuery, (errDb2, dbRes2) => {
                if (errDb2) {
                  return res.json("Database error - inserting tags");
                } else {
                  // res.redirect('/organizer/main');
                  // console.log("I am here");
                  // return;
                }
              });
            }
            let rdlDate = new Date(insertObject[5]);
            var nextDate;
            let queryUpdateSession =
            "SELECT min(cs.session_start) AS next_sess from courses LEFT JOIN course_sessions cs ON cs.course_id = id WHERE course_deadline >= CURRENT_DATE AND cs.session_start >= CURRENT_TIMESTAMP AND id = $1;";
            database.query(queryUpdateSession, [courseID], (errOutDB3, dbRes3) => {
                if(errOutDB3){
                  return res.json("Database error - getting session update");
                } else {
                  console.log(dbRes3.rows[0]['next_sess']);
                  nextDate = new Date(dbRes3.rows[0].next_sess);
                }
                console.log(nextDate + " " + courseID);
                io.emit('courseAdd', {course: {
                  id: courseID,
                  title: insertObject[0],
                  topic: insertObject[1],
                  delivery: insertObject[2],
                  sessions: insertObject[3],
                  nextSession: nextDate.toLocaleString("en-US", {dateStyle: 'short', timeStyle: 'short'}),
                  seats: 0,
                  maxSeats: insertObject[4],
                  rdeadline: rdlDate.toLocaleString("en-US", {dateStyle: 'short', timeStyle: 'short'}),
                  status: insertObject[7] ? 'Open' : 'Closed',
                }});
                return res.redirect('/organizer/main');
              }
            );

          }
        });


      }
    });
  },

  viewCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let isOrganizer = (req.user.type === 'organizer');
    //retrieve name, topic, location, max capacity, current seats, description, session times
    let getCourse = `
        SELECT courses.course_name, courses.topic, courses.location, courses.sessions, courses.seat_capacity,
        courses.description, course_sessions.session_start, course_sessions.session_end, course_sessions.session_name
        FROM courses, course_sessions
        WHERE courses.id = course_sessions.course_id
        AND courses.id=$1;
        `;
    let isEnrolledQuery = `
        SELECT time FROM enrollment WHERE course_id=$1 AND user_id=$2;
        `
    database.query(getCourse, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - viewing courses");
      }
      if (dbRes.rows.length > 0) {
        //only 1 query needed
        //Can be case where there is no course_sessions -> will need to check
        database.query(isEnrolledQuery, [courseID, req.user.id], (dbErr2, dbRes2) => {
            if (dbErr2) {
              return res.json("Database error - checking enrollment")
            }
            let isEnrolled = dbRes2.rows.length > 0  ? true : false;
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
                session_name: oldRow.session_name
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
          });
        } else {
          let inputObject = {
            redirect: '/main',
            message: 'Course does not exist.',
            target: 'the main page'
          }
          return res.render('pages/redirect', inputObject)
        }
      });


  },

  enrollCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let userID = req.user.id;

    /*
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
    /*
    // update user position
    let getCourseEnrollment = 'SELECT user_id, time FROM enrollment WHERE course_id = $1';
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
    console.log(userPosition)
    */
    // enrolling user into course
    let insertCourseEnrollment = `
        INSERT INTO enrollment (course_id, user_id, time) VALUES ($1, $2, CURRENT_TIMESTAMP);
        `;

    let getTotalPositions = `SELECT seat_capacity FROM courses WHERE id=$1;`;

    //obviously, some of these queries could be combined together
    let queryPosition = `
    SELECT course_id, COUNT(e2.user_id) AS position FROM enrollment e2 WHERE e2.course_id IN
    (SELECT course_id FROM enrollment e WHERE e.user_id = $1 AND e2.time<=e.time ORDER BY time ASC)
    GROUP BY course_id;
    `;

    //console.log(courseID + " " + userID);
    database.query(insertCourseEnrollment, [courseID, userID], (dbErr, dbRes) => {
      if (dbErr) {
        //console.log(dbErr);
        let errorBlock = {
          redirect: '/main',
          message: 'You are already enrolled (or there is some nasty primary key desync).',
          target: 'the main page'
        };
        return res.render("pages/redirect", errorBlock);
      }
      database.query(getTotalPositions, [courseID], (dbErr1, dbRes1) => {
        if (dbErr1) {
          return res.json("Database error - checking seat capacity for enrollment")
        }
        database.query(queryPosition, [userID], (dbErr2, dbRes2) => {
          let backToMain = {
            redirect: '/main',
            target: 'the main page'
          };
          if (dbErr2) {
            return res.json("Database error - checking position for enrollment")
          } else if (dbRes2.rows[0].position > dbRes1.rows[0].seat_capacity) {
            backToMain.message = "Added to waitlist for this course. You will be notified if you move off the waitlist."
          } else {
            backToMain.message = "Course enrolled successfully!"
          }
          io.emit('courseEnroll', {courseID: courseID});
          return res.render('pages/redirect', backToMain);
        });
      });
    });
  },

  withdrawCourse: async (req, res) => {
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

    // withdraw user from course
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
        io.emit("courseWithdraw", {courseID: courseID});
        res.redirect('/courses/' + courseID);
      }
    });
  },

  renderEditCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let getCourseDetails = `
    SELECT courses.course_name, courses.topic, courses.location, courses.sessions, courses.seat_capacity,
    courses.description, courses.enabled, courses.course_deadline, course_sessions.session_start, course_sessions.session_end, course_sessions.session_name
    FROM courses, course_sessions
    WHERE courses.id = course_sessions.course_id
    AND courses.id=$1;
    `;

    let courseTagsQuery = `SELECT tag FROM tags WHERE course_id = $1;`;
    let possibleTagsQuery = `SELECT DISTINCT tag FROM tags;`;
    let getUserDetails = `
    SELECT enrollment.user_id, users.email FROM enrollment, users
    WHERE course_id = $1 AND users.id = enrollment.user_id
    ORDER BY time asc;
    `
    //24 hr time format
    //example: 23:59:00
    let timeFormat = /(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/g;

    database.query(getCourseDetails, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json('Database error - getting course details for editing');
      }
      database.query(courseTagsQuery, [courseID], (currTagErr, curTagRes) => {
        if (currTagErr) {
          return res.json('Database error - getting current course tags for editing')
        }
        let currentTags = [];
        for (row of curTagRes.rows) {
          currentTags.push(row["tag"]);
        }
        database.query(possibleTagsQuery, (allTagErr, allTagRes) => {
          if (allTagErr) {
            return res.json('Database error - getting possible tags');
          }
          database.query(getUserDetails, [courseID], (userErr, userRes) => {
            if (userErr) {
              return res.json("Database error - getting enrolled users for courses")
            }
            let possibleTags = [];
            for (row of allTagRes.rows) {
              possibleTags.push(row["tag"]);
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

              let seat_capacity = dbRes.rows[0]['seat_capacity'];
              let enrolledUsers = userRes.rows;
              let waitlistUsers = enrolledUsers.splice(seat_capacity);

              let inputObject = {
                id: courseID,
                title: dbRes.rows[0]['course_name'],
                topic: dbRes.rows[0]['topic'],
                location: dbRes.rows[0]['location'],
                description: dbRes.rows[0]['description'],
                sessionNum: dbRes.rows[0]['sessions'],
                sessions: formattedDates,
                deadline: deadline,
                enabled: dbRes.rows[0]['enabled'],
                seats: dbRes.rows[0]['seat_capacity'],
                curTags: currentTags,
                allTags: possibleTags,
                editCourse: true,
                users: enrolledUsers,
                waitlistUsers: waitlistUsers
              }
              console.log(inputObject);
              return res.render('pages/editCourse', inputObject);
            } else {
              return res.json("Could not retrieve course records");
            }
          });
        });
      });
    });
  },

  editCourse: (req, res) => {
    let courseID = parseInt(req.params.id, 10);
    let updateCourseDetails = `
    UPDATE courses
    SET course_name=$1, topic=$2, location=$3, sessions=$4, seat_capacity=$5, description=$6, course_deadline=$7, enabled=$8
    WHERE id=$9;
    `;
    let updateCourseContent = [
      req.body.coursename,
      req.body.topic,
      req.body.location,
      req.body.sessionTracker,
      req.body.capacity,
      req.body.description,
      (req.body.deadline + ' ' + req.body.deadTime),
      (req.body.registration === 'enabled' ? true : false),
      courseID,
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
          } else {
            let deleteTagQuery = `DELETE FROM tags WHERE course_id = ${courseID};`;

            database.query(deleteTagQuery, (delErr, delRes) => {
              if (delErr) {
                return res.json("Database error - deleting tags");
              } else {
                console.log(req.body.tags);
                if (req.body.tags != "") {
                  // construct query for tags
                  let insertTagsQuery = `INSERT INTO tags (course_id, tag) VALUES `;
                  let tags = (req.body.tags).split(',')
                  for (tag of tags) {
                    insertTagsQuery += `(${courseID}, '${tag}'), `
                  }
                  insertTagsQuery = insertTagsQuery.substring(0, insertTagsQuery.length-2);
                  insertTagsQuery += ';'
                  console.log("Tags");
                  console.log(insertTagsQuery);

                  database.query(insertTagsQuery, (errDb2, dbRes2) => {
                    if (errDb2) {
                      return res.json("Database error - inserting tags");
                    }
                  });
                }
              }
            });
          }
          return res.redirect('/organizer/main');
        })
      })



    })
  },

  deleteCourse: (req, res) => {
    //can be called by organizers (accompanied by client-side alerts)
    let courseID = parseInt(req.params.id, 10);
    let deleteQuery = `DELETE FROM courses WHERE id=$1;`
    database.query(deleteQuery, [courseID], (dbErr, dbRes) => {
      if (dbErr) {
        return res.json("Database error - could not delete course")
      }
      io.emit("courseDelete", {courseID: courseID});
      return res.redirect('/organizer/main')
    })

  },


}
