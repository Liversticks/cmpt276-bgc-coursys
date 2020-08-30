# BGC Coursys
GitLab link: https://csil-git1.cs.surrey.sfu.ca/mla283/cmpt-276-bgcoursys

The backend organization (database interface, passport-js, express setup) was adapted from here: https://github.com/DayOnePl/dos-server. 

## Abstract
BGC Engineering is seeking to streamline and modernize their employee-training system. The BGC Coursys system will replace the old system of manual mail-lists, reminders, and Excel spreadsheets. There are two types of users: attendees (employees) and organizers (BGC-internal course organizers and those who coordinate with external sources). Organizers will be able to create and schedule course offerings and create groups of attendees. Attendees will be able to search courses and create “tags” that indicate what areas they seek training in. All users can sign up for courses and indicate “Interested” status on specific courses. All users will be able to view a calendar of courses, where they can filter by courses or interest tags and can export the calendar for use elsewhere. Courses will have an attendance limit; registration will be tracked in real-time, so once that limit is reached attendees will be put on a wait-list or given future priority enrollment for another iteration of the course. Notifications will be sent out to attendees for RSVP (confirming attendance) and when their wait-list status changes. If time/effort permits, the BGC Coursys system will be integrated with BGC Engineering’s internal SharePoint service.

## Current Processes
BGC has a group of 20+ employees organizing and setting up the employee training events. Currently the company has an excel file on SharePoint to communicate between the organizers, and to keep track of all the event schedules and details. The organizers would look at the excel file, determine the next upcoming event, and manually send out email invites to employees. Seating for the events are first come, first serve and the organizers keep track of the number of people signed up in the excel file on SharePoint. Once all the spots are filled, they respond back to the emails confirming if each individual was registered or not registered in the course. There are currently no processes set up to track employees' interest in the courses.

## Improvements
By implementing this system, it will reduce the time needed to track employee interests and attendance. The process of keeping track of people will be less prone to human error, such as people forgetting who registered. Moreover, this system can be scaled to handle other categories of recurring events (such as employee fun events).

## User Stories

### High Priority
#### New Account Signup

Any employee can create a new attendee account.

In order to create a new account, users need to provide an email address and a password.

Passwords must be at least [TBD] characters long and must contain/cannot contain [special characters/TBD regex].

Users must confirm their password before submitting. The form will not be allowed to submit unless the password matches the “confirm password”.

#### Login Page

Users must log in to see events.

On the login screen, there should be an option to log in as an “Attendee” (regular user) or as an “Organizer” (course organizer).

On the login screen, I should be able to enter a username/email and a bullet-protected password.

If login is unsuccessful, I should receive an alert saying that my credentials are incorrect. If login is successful, I should be directed to a landing page. If I am not logged in, I should be redirected to the login screen when I try to access a protected (requires login) page.

#### Course Signup - Landing Page

A page with the list of courses offered. Users should be able to view courses as a list.

When a course is clicked on there should be a page with information about it and a sign up and interested button.

If users are currently signed up, they will instead be able to drop (cancel) the course.

Upon clicking the sign up button there are two cases. If the course is full, the user gets an alert and is asked if they would like to be added to a waitlist. If the course is not full, the user will get an alert to signify they have successfully signed up.

On the course page there should be the ability to see how many users signed up for each course.

Landing page for organizers will have an extra link to edit courses.

(Waitlist functionality will be real-time)

#### Course Management

Only organizers can create courses. On the courses overview page, organizers will be able to create a new course.

To create a new course, an organizer will need to provide the course title, a short description of the course, the date and time of the course, and the location.

Upon creating a new course, all users should be able to view and sign up for the course in the courses overview page.

If the course was created successfully, then the organizer should receive a confirmation alert/page. If there was an error, then existing courses should not be affected and the organizer is alerted accordingly.


### Medium Priority

#### Course Cancellation

If a user who is signed up for a course is no longer interested, they have the ability to take themselves out of the course.

Users will be prompted to confirm before they cancel (drop) the course.

When a user cancels, a spot in the course will be opened and the number of participants will be updated in real time.

If there are users on the waitlist, the user in waitlist position #1 will be automatically registered into the course.

#### New Account Signup - Approvals

Before accounts are “active”, they must be approved by organizers.

Organizers will be able to set the status of new accounts as “Attendee” or “Organizer”.

#### Course Signup - Landing Page (more features)

A list of all courses is displayed. Each entry contains a link to the course details page.

On the list of all courses, the number of registered attendees and the number of total seats is shown.

#### Course Details Page

The course title is clearly visible and near the top of the page.

Below the course title, users can view a short description of the course; the date/time where the course will be held; and the location of the course.

Below the course description/details, a list of all registered attendees names and their email addresses is shown.

Below the registered attendees, a list of all interested attendees names and their email addresses is shown.

Below the interested attendees, a list of all waitlisted (did not register as no space was available) attendees name and email addresses

#### User Management

Only organizers can delete users (to accommodate when employees leave the company) and create new organizer accounts.

### Low Priority
#### Reminders

If a user is registered in a course, then the system will send periodic reminders (such as by email) to remind them.

If a user is on the waitlist and is moved to regular registration, then the system will let them know that the change was made.

If the size of a class is changed by an organizer and the amount of registered users exceeds that of the new maximum attendance, then the users who signed up most recently will be moved onto the wait-list and notified accordingly.

(An email API can be used to send reminder emails)

#### Tags

On the landing page, users can filter through courses by “tags” such as “Time Management”, “Leadership” etc.

Every course will have at least one associated tag.

When an organizer creates a course, they will be able to assign tags to that course.

#### Interested Status

On the landing page, users can select whether they are interested in a particular course. The user will be added to a list of interested people for that course.

On the landing page, the number of interested participants is shown.

The list of interested users is viewable by the organizer. The system will remember that the user is interested for the future.

Users will be able to remove interested status from the landing page if they are no longer interested in a course.
