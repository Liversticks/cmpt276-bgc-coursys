# BGC Coursys

Created by Ngoc duy (Adrian) Nguyen, Minh (Brian) Le, and Oliver Xie

## About

BGC Coursys is a course management system. All users can register for open courses; if the course is full, they will be automatically put onto a waitlist. Organizers (admin users) have the power to create, modify, and delete multi-session courses.

## User Management

### Account Levels

#### Attendee

* Can register in courses
* Can withdraw from courses
* Can view currently-open courses

#### Organizer

All attendee permissions, plus:
* Can create new courses
* Can modify existing courses:
  * Change registration deadline
  * Change title/topic/location/capacity
  * Change number of sessions
  * Change whether the course is open (viewable to attendees)
  * Delete the course
* Can manage other users:
  * Can activate/deactivate users
  * Can change users from attendee to organizer and vice versa
  * Can delete users
* Can send reminder email for courses


### Account Creation

The `/newuser` path is where new users are created. By default,
* The username must be a BGC Engineering email (one that ends in `@bgcengineering.ca`)
* The password must satisfy the following:
  * At least 8 characters
  * Minimum of one lowercase letter
  * Minimum of one uppercase letter
  * Minimum of one number
  * Special characters are supported
* New accounts created are attendee accounts.
* A new account must be activated by an organizer before it can log in

Account creation source code is located in `./userTypes/users/index.js`.

### Login/Logout

Enter a valid email and password to log in. There are no restrictions on the number of login attempts.
Login is done using sessions. It is permitted for a user to be logged in via multiple sessions (devices/browsers) at once.
Currently, sessions are set to expire after one hour.

To logout, go to the `/logout` path or click the power button on the sidebar. If users are logged in with more than one instance, they will be logged out on that session.

Currently, authentication is done using the [passport-js](http://www.passportjs.org/) local strategy.

* Passport configuration is located in `./config/passport.js`.
* Authentication middleware (restrictions on what type of user can access what paths) is located in `./config/middleware/auth.js`.

## Course Management

### Creation

Only organizers can create courses. To create a course, go to the `/organizer/main` path and click the plus icon or go to the `/courses/new` path directly.
The following fields are required when creating courses:
* course name (currently limited to 30 characters)
* course topic (currently limited to 30 chars)
* course location (currently limited to 30 chars)
* number of spaces (seat capacity)
* Registration deadline. (Attendees will only be able to view courses for which the registration deadline has not passed)
* At least one course session

Without tampering with the scripts, sessions cannot be created out of order.

The following fields are optional:
* Description (no character limit)
* Tags (additional descriptors used to group related courses)

If the "Accept Registration" box is checked, it will be visible to all attendees until its registration deadline passes. Otherwise, it will be hidden to attendees.

* Course creation backend is located in `./userTypes/courses/index.js`.
* The template for the organizer-course page is `./views/pages/orgIndex.ejs`.
* The main course HTML template (shared with the edit page) is `./views/partials/courseForm.ejs`.
* The new-course-specific HTML template is `./views/pages/newCourse.ejs`.

### Editing/Deleting

Only organizers can edit courses. To edit a course, go to the `/organizer/main` path and click on the desired table row or go to `/courses/edit/ID` if you know the course ID.

All fields can be edited. Reducing the course capacity will move users onto the waitlist based on their enrollment time. Expanding the course capacity will move users from the waitlist to regular registration. This is as the registration queue is currently implemented with timestamps; the first CAPACITY users are enrolled, the rest are waitlisted. Un-accepting registration will not kick any currently-enrolled users (only hide the course so attendees cannot see it).

To delete the course, click the "Delete Course" button, then enter "Please delete this course." exactly. This is a client-side script intended to allow course deletion but make it tedious (minimizing accidental user deletion).

At the bottom of the page, there are ordered lists of enrolled/waitlisted users.

* Course editing backend is located in `./userTypes/courses/index.js`.
* The main course HTML template (shared with the new-course page) is `./views/partials/courseForm.ejs`.
* The edit-specific HTML template is `./views/pages/editCourse.ejs`.

## Course Enrollment/Withdrawal

To enroll (for all users):
* Go to `/main`, then click on the desired row in the table (using the search bar/table columns sorting as needed)
* Click the enroll button

The user will be redirected back to the main page (`/main`). The message on the redirect page will indicate whether the registration was successful (enrolled) or whether the user was put on the waitlist.

To withdraw:
* Go to the same page for enrollment
* Click on the Withdraw button. (Currently, there is no alert, but the button will change to Enroll)

If a user enrolls, withdraws, then enrolls again, the system currently does not remember the old position (so the user would be put at the end of the line).

* Rendering the main page (`/main`) is done in `./userTypes/users/index.js`.
* The main page template is at `./views/pages/index.ejs`.
* The template used for viewing courses is `./views/pages/viewCourse.ejs`.
* Course enrollment backend code is in `./userTypes/courses/index.js`.

## Real-Time Features

* On the landing page (`/main`), any updates to courses (new course created, course capacity changed etc.) are visible without refreshing the page.
* On the organizer course creation page (`/organizer/main`), updates to courses are similarly simultaneously visible.

Socket.IO setup on the server-side is done in `./config/io.js`. Client-side Socket.IO is supported for `./views/pages/index.ejs` and `./views/pages/orgIndex.ejs`.

## Email Reminders

BGC Coursys will send emails to user accounts directly (hence why accounts must be created with a BGC email address). Currently, we use the [Sendgrid API](https://sendgrid.com/) to send emails.

Setup:
* Generate a valid API key
* Designate a sending email address (that will not be auto-deleted/marked as spam)
* Change the email templates. Currently, they have hard-coded links to the Heroku URL.


Automated emails are sent when:
* New users are approved by an organizer (template: in updateUsers in `./userTypes/organizer/index.js`)
* Users are moved from the waitlist to enrolled (when course grows in capacity) (template: in withdrawCourse in `./userTypes/courses/index.js`)

Manual emails can be sent by organizers on the view-course page (`/courses/ID`). (Ideally, these would be sent automatically a certain amount of time before the first session, but Heroku did not support this). The template is in sendReminders in `./userTypes/organizer/index.js`.

## User Course Status

We wished we had more time/energy left to implement a profile page for users to easily view their past/current course enrollment. As temporary workarounds,
* On the main page (`/main`), searching for "Enrolled" will show future courses (registration deadline has not passed yet) that the user is successfully enrolled in
* Similarly, searching for "Waitlisted" will show future courses that user is currently waitlisted in.

IMPORTANT: AS OF NOW, THERE IS NO WAY FOR A USER TO VIEW COURSE DETAILS FOR A COURSE THEY ARE CURRENTLY ENROLLED/WAITLISTED IN BUT WHERE THE REGISTRATION DEADLINE HAS PASSED. (This is due to the queryCourse query in the landing function in `./userTypes/users/index.js`, which filters using the course deadline). Organizers will be able to "view" the details regardless of time by going to the course edit page without making any changes.

Ideally, we would build a user page to show the user's past enrolled courses and current enrolled/waitlisted courses. One could use the following query:
`let query = 'SELECT c.* FROM COURSE c, ENROLLMENT e WHERE c.id = e.course_id AND e.user_id = $1;'` (passing the userID, located in req.user.id, as the query parameter), then map the result rows into a table. One would access this page from the sidebar.

## Technical details

* Project layout based on https://github.com/DayOnePl/dos-server
* Check package.json for dependencies
* We used PostgreSQL for the database. In `./database/databaseSetup.sql` there is a handy list of what tables need to be created.
* Two environment variables are set:
  * LOCALDATABASE/DATABASE_URL (connection string)
  * SENDGRID_API
