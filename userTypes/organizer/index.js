//index.js
//handles organizer-only functions
const database = require('../../database');
const sgMail = require('@sendgrid/mail');

module.exports = {

	//add organizer-only functions here

	//dummy data + will need to build links to organizer-only features
	landing: async (request, result) => {
        let queryCourse = `
        SELECT id, course_name, topic, location, sessions,
                seat_capacity
        FROM courses
        `;

        try {
            var data = [];

            database.query(queryCourse, (errOutDB, dbRes) => {
                if (errOutDB){
                    result.send("Error querying db on landing/main");
                } else {
                    //var dateFormat = {hour:'numeric', minute: 'numeric', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
                    for (var row=0; row < dbRes.rows.length; row++) {
                        let startDate = new Date(dbRes.rows[row].start_date);
                        data.push(
                            {
																id: dbRes.rows[row].id,
																title: dbRes.rows[row].course_name,
                                topic: dbRes.rows[row].topic,
                                delivery: dbRes.rows[row].location,
                                //time: startDate.toLocaleString("en-US", dateFormat),
																sessions: dbRes.rows[row].sessions,
                                seats: '?',
                                maxSeats: dbRes.rows[row].seat_capacity,
                                status: "N/A"
                            }
                        );
                    }
                    console.log(data);
                    result.render('pages/orgIndex', { data: data });
                }
            });
        } catch (err) {
            result.send("Error");
        }
  },
	//as of now, organizer accounts must be manually created
	allusers: (request, result) => {
		//access database
		database.query('SELECT id, email, type, approved FROM users;', (err, dbRes) => {
			if (err) {
				return result.json("Could not retrieve database values to show all users");
			}
			//pass in data to render
			let idArray = dbRes.rows.map((item) => {
				return parseInt(item.id, 10);
			});
			let minID = Math.min(...idArray);
			let maxID = Math.max(...idArray);

			return result.render('pages/allusers', { userData: dbRes.rows, curUser: request.user.email, minID: minID, maxID: maxID });
		});
	},

	updateUsers: async (request, result) => {
		//updates all users whose status has changed
		let minID = parseInt(request.body.minID, 10);
		let maxID = parseInt(request.body.maxID, 10);
		let newAttendees = [];
		let attendeeParams = [];
		let newOrganizers = [];
		let organizerParams = [];
		let newApproved = [];
		let approvedParams = [];
		let newDisable = [];
		let disableParms = [];
		let deletedUsers = [];
		let deletedParams = [];

		//Needs to start from

		for (let i = minID; i <= maxID; i++) {
			if (request.body["id" + i]) {
				//delete user
				if (request.body['delete' + i]) {
					deletedUsers.push(i);
				}
				else if (request.body["status" + i] === 'attendee') {
					newAttendees.push(i);
				}
				else {
					newOrganizers.push(i);
				}
			}
			if (request.body["approved" + i] === 'true') {
					newApproved.push(i);
			} else {
					newDisable.push(i);
			}
		}


		for (let j = 0; j < newAttendees.length; j++) {
			attendeeParams.push(newAttendees[j]);
		}
		for (let k = 0; k < newOrganizers.length; k++) {
			organizerParams.push(newOrganizers[k]);
		}
		for (let l = 0; l < newApproved.length; l++) {
			approvedParams.push(newApproved[l]);
		}

		let deletedUsersString = deletedUsers.map((number) => {
			console.log(number.toString(10));
			return number.toString(10);
		});

		for (let m = 1; m <= newAttendees.length; m++) {
			attendeeParams.push('$' + m);
		}
		for (let n = 0; n < newDisable.length; n++) {
			disableParms.push(newDisable[n]);
		}
		for (let o = 1; o <= deletedUsers.length; o++) {
			deletedParams.push('$' + o);
		}
		let newAttendeeQuery = "UPDATE users SET type='attendee' WHERE id IN (" + attendeeParams.join(',') + ");"
		let newOrganizerQuery = "UPDATE users SET type='organizer' WHERE id IN (" + organizerParams.join(',') + ");"
		let newApprovedQuery = "UPDATE users SET approved=true WHERE id IN (" + approvedParams.join(',') + ");"
		let newDisableQuery = "UPDATE users SET approved=false WHERE id IN (" + disableParms.join(',') + ");"
		// List of users to email, only those that weren't approved before
		let toEmailQuery = `SELECT * FROM USERS WHERE id IN (${approvedParams.join(',')}) AND approved = FALSE;`;
		let deletedQuery = "DELETE FROM users WHERE id IN (" + deletedParams.join(',') + ");"
		let deleteSessionsQuery = "DELETE FROM session WHERE sess::json#>>'{passport, user}' IN (" + deletedParams.join(',') + ");"
		/*
		console.log(newAttendees);
		console.log(newAttendeeQuery);
		console.log(newOrganizers);
		console.log(newOrganizerQuery);
		console.log(newApproved);
		console.log(approvedParams);
		console.log(newApprovedQuery);
		console.log(newDisable);
		console.log(newDisableQuery);
		console.log(toEmailQuery);
		console.log(deletedUsers);
		console.log(deletedUsersString);
		console.log(deletedQuery);
		console.log(deleteSessionsQuery);
		*/

		let errors = [];
		database.query(toEmailQuery, async(dbErr, dbRes) => {
			if (dbErr) {
				errors.push("Database error - could not get list of users to email");
			} else {
				let usersToEmail = dbRes.rows
				console.log(usersToEmail);
				if (newApproved.length > 0) {
					database.query(newApprovedQuery, (dbErr, dbRes) => {
						if (dbErr) {
							errors.push("Database error - could not update new approved");
						}
					});
				}
				try {
					for (user of usersToEmail){
						sgMail.setApiKey(process.env.SENDGRID_API_KEY);
						const msg = {
							to: user.email,
							from: 'mla283@sfu.ca',
							subject: `BGC Coursys: Account Approved`,
							text: `Congratulations your account has been approved!

									Login at cmpt276-bgc-coursys.herokuapp.com/`,
							html: `Congratulations your account has been approved!
									<br><br>
									To view more information please visit
									<a target="_blank" href="https://cmpt276-bgc-coursys.herokuapp.com/">
									cmpt276-bgc-coursys.herokuapp.com/</a>`,
							};
						console.log(user.email);
						console.log(await sgMail.send(msg));
					}
				} catch(err) {
					errors.push("Email error - could not send emails to newly approved");
				}
			}
		});



		if (deletedUsers.length > 0) {
			database.query(deletedQuery, deletedUsers, (dbErr, dbRes) => {
				if (dbErr) {
					errors.push("Database error - could not delete users");
				}
				database.query(deleteSessionsQuery, deletedUsersString, (dbErr1, dbRes1) => {
					if (dbErr1) {
						errors.push("Database error - could not delete sessions");
					}
				});
			});
		}

		if (newAttendees.length > 0) {
			database.query(newAttendeeQuery, (dbErr, dbRes) => {
				if (dbErr) {
					errors.push("Database error - could not update new attendees");
				}
			});
		}

		if (newOrganizers.length > 0) {
			database.query(newOrganizerQuery, (dbErr, dbRes) => {
				if (dbErr) {
					errors.push("Database error - could not update new organizers");
				}
			});
		}

		if (newDisable.length > 0) {
			database.query(newDisableQuery, (dbErr, dbRes) => {
				if (dbErr) {
					console.log(dbErr);
					errors.push("Database error - could not update new disabled");
				}
			});
		}

		if (errors.length > 0) {
			return result.json(errors);
		}

		return result.render('pages/redirect', { redirect: '/organizer/main', message: 'User data has been successfully updated!', target: 'the main courses page'});
	},

	newCourse: (request, result) => {
		result.render('pages/newCourse');
	},

	sendReminders: async (req, res) => {
		// using Twilio SendGrid's v3 Node.js Library
		// https://github.com/sendgrid/sendgrid-nodejs
		sgMail.setApiKey(process.env.SENDGRID_API_KEY);
		try {
			let getEmails =
			`SELECT u.email FROM users u, enrollment e, courses c
			WHERE c.id=e.course_id and e.user_id=u.id and c.id=${req.params.id};`;
			let getCourseInfo =
			`SELECT * FROM courses WHERE id=${req.params.id};`;
			let getNextSession =
			`SELECT * FROM course_sessions WHERE course_id=${req.params.id} AND
			session_start >= CURRENT_DATE ORDER BY session_start ASC;`
			let emails = await database.query(getEmails);
			let courseInfo = await database.query(getCourseInfo);
			let nextDate = await database.query(getNextSession);
			courseInfo = courseInfo.rows;
			nextDate = nextDate.rows[0].session_start;
			console.log(emails);
			if (emails.rowCount === 0) {
				res.render('pages/redirect', { redirect: `/courses/${req.params.id}`, message: 'No users enrolled, no emails sent.', target: 'the course view'});
			}
			for (row of emails.rows) {
				if (courseInfo === undefined) {
				break;
				}
				const msg = {
				to: row.email,
				from: 'mla283@sfu.ca',
				subject: `Course Reminder: ${courseInfo[0].course_name}`,
				text: `This is a reminder that you are enrolled in ${courseInfo[0].course_name}
						which is scheduled for ${nextDate} in ${courseInfo[0].location}.

						To view more information please visit cmpt276-bgc-coursys.herokuapp.com/courses/${courseInfo[0].id}`,
				html: `This is a reminder that you are enrolled in ${courseInfo[0].course_name} which is scheduled for
						<br>
						<strong>${nextDate}</strong> in <strong>${courseInfo[0].location}</strong>.
						<br><br>
						To view more information please visit
						<a target="_blank" href="https://cmpt276-bgc-coursys.herokuapp.com/courses/${courseInfo[0].id}">
						cmpt276-bgc-coursys.herokuapp.com/courses/${courseInfo[0].id}</a>`,
				};
				console.log(msg);
				// will go to catch on failure
				console.log(await sgMail.send(msg));
		}
		res.render('pages/redirect', { redirect: `/courses/${req.params.id}`, message: 'Email sent successfully!', target: 'the course view'});
		} catch(err) {
			console.log(err);
			res.render('pages/redirect', { redirect: `/courses/${req.params.id}`, message: 'ERROR: EMAIL NOT SENT! API failure.', target: 'the course view'});
		}
	}


}
