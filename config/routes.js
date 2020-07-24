//routes.js
//adapted from https://github.com/DayOnePl/dos-server/blob/master/config/routes.js
//API for website


const auth = require('./middleware/auth');
const organizer = require('../userTypes/organizer');
const users = require('../userTypes/users');
const courses = require('../userTypes/courses');


module.exports = (app, passport, database) => {
  //login and logout
  app.get('/login', users.login);
  app.post('/login', passport.authenticate('local', { failureRedirect: '/loginfail' }), users.login);
  app.get('/loginfail', users.loginFail);
  app.get('/logout', auth.requiresLogin, users.logout);

  //Landing page
  app.get('/main', auth.requiresLogin, users.landing);

  //create new user of attendee status
  app.get('/newuser', users.signup);
  app.post('/newuser', users.createAccount);



  //organizer-only paths
  app.get('/organizer/main', auth.requiresOrganizer, organizer.landing);
  app.get('/organizer/allusers', auth.requiresOrganizer, organizer.allusers);
  app.post('/organizer/allusers', auth.requiresOrganizer, organizer.updateUsers);

  //course-related paths
  app.get('/courses/new', auth.requiresOrganizer, courses.renderNewCourse);
  app.post('/courses/new', auth.requiresOrganizer, courses.submitNewCourse);
  //add option for change status of members
  app.get('/courses/:id', auth.requiresLogin, courses.viewCourse);
  app.post('/courses/enroll/:id', auth.requiresLogin, courses.enrollCourse);
  app.get('/courses/edit/:id', auth.requiresOrganizer, courses.renderEditCourse);
  app.post('/courses/edit/:id', auth.requiresOrganizer, courses.editCourse);

  //add additional routes that require authentication to access, else they will be redirected to login
  //view course details -> need identifier
  //edit course details -> need identifier

  //admin section
  // create new course
  app.get('/newcourse', courses.renderNewCourse);
  app.post('/newcourse', courses.submitNewCourse);

  app.post('/organizer/sendReminder/:id', auth.requiresOrganizer, organizer.sendReminders);

}
