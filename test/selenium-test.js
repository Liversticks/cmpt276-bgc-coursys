//selenium-test.js
//selenium-focused (browser/UI) tests

//only run tests on Chrome for simplicity
let { Builder, By, Key, until } = require('selenium-webdriver');
let chai = require('chai');
let expect = chai.expect;

const loginURL = 'https://cmpt276-bgc-coursys.herokuapp.com/login';
const logoutURL = 'https://cmpt276-bgc-coursys.herokuapp.com/logout';
const localLogin = 'localhost:5000/login';
const localLogout = 'localhost:5000/logout';

describe('login-interactions', function() {
  //set timeout to be longer to account for internet issues
  //especially as starting the Heroku dyno may take a while

  this.timeout(60000);
  const driver = new Builder().forBrowser('chrome').build();

  it('/login should return an empty email (username) field', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    const loginField = await driver.findElement(By.name('uname')).getAttribute('value');

    expect(loginField).to.equal('');

  });
  it('/login should return an empty password field', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    const passwordField = await driver.findElement(By.name('pwd')).getAttribute('value');

    expect(passwordField).to.equal('');
  })
  it('should return the authentication error page with an empty password and empty email field', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    await driver.findElement(By.id('loginSubmit')).click();
    const failEmailField = await driver.findElement(By.name('uname')).getAttribute('value');
    const failPassField = await driver.findElement(By.name('pwd')).getAttribute('value');
    const errorMessage = await driver.findElement(By.css("p")).getText();
    const curURL = await driver.getCurrentUrl();

    expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/loginfail');
    expect(failEmailField).to.equal('');
    expect(failPassField).to.equal('');
    expect(errorMessage).to.equal('Authentication error (incorrect email or password).');

  });
  it('should return the authentication error page with valid-formatted but not-in-database email and empty password', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    await driver.findElement(By.name('uname')).sendKeys('notAValid@Email');
    await driver.findElement(By.id('loginSubmit')).click();
    const failEmailField = await driver.findElement(By.name('uname')).getAttribute('value');
    const failPassField = await driver.findElement(By.name('pwd')).getAttribute('value');
    const errorMessage = await driver.findElement(By.css("p")).getText();
    const curURL = await driver.getCurrentUrl();

    expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/loginfail');
    expect(failEmailField).to.equal('');
    expect(failPassField).to.equal('');
    expect(errorMessage).to.equal('Authentication error (incorrect email or password).');

  });
  it('should return the authentication error page with empty email and something in password field', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    await driver.findElement(By.name('pwd')).sendKeys('v3ryStr0ngPa55');
    await driver.findElement(By.id('loginSubmit')).click();
    const failEmailField = await driver.findElement(By.name('uname')).getAttribute('value');
    const failPassField = await driver.findElement(By.name('pwd')).getAttribute('value');
    const errorMessage = await driver.findElement(By.css("p")).getText();
    const curURL = await driver.getCurrentUrl();

    expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/loginfail');
    expect(failEmailField).to.equal('');
    expect(failPassField).to.equal('');
    expect(errorMessage).to.equal('Authentication error (incorrect email or password).');
  });
  it('should return the authentication error page with incorrect email and incorrect password', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    await driver.findElement(By.name('uname')).sendKeys('invalidEmail@bgcengineering.ca');
    await driver.findElement(By.name('pwd')).sendKeys('v3ryStr0ngPa55');
    await driver.findElement(By.id('loginSubmit')).click();
    const failEmailField = await driver.findElement(By.name('uname')).getAttribute('value');
    const failPassField = await driver.findElement(By.name('pwd')).getAttribute('value');
    const errorMessage = await driver.findElement(By.css("p")).getText();
    const curURL = await driver.getCurrentUrl();

    expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/loginfail');
    expect(failEmailField).to.equal('');
    expect(failPassField).to.equal('');
    expect(errorMessage).to.equal('Authentication error (incorrect email or password).');

  });
  it('should return the landing page (/organizer/main) for a correctly authenticated organizer user', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
    await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
    await driver.findElement(By.id('loginSubmit')).click();
    const curURL = await driver.getCurrentUrl();

    expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/organizer/main');
    await driver.get(logoutURL);
  });
  it('should return the landing page (/main) for a correctly authenticated attendee user', async function() {
    await driver.get(loginURL);
    await driver.sleep(2000);
    await driver.findElement(By.name('uname')).sendKeys('test-attendee@bgcengineering.ca');
    await driver.findElement(By.name('pwd')).sendKeys('11111111aA');
    await driver.findElement(By.id('loginSubmit')).click();
    const curURL = await driver.getCurrentUrl();

    expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/main');
    await driver.get(logoutURL);
  });
  it('should return the login page after logging out');

  describe('main-menu', function() {
    it('sidebar should contain four elements for attendee user', async function() {
      await driver.get(loginURL);
      await driver.sleep(1000);
      await driver.findElement(By.name('uname')).sendKeys('test-attendee@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('11111111aA');
      await driver.findElement(By.id('loginSubmit')).click();

      const links = await driver.findElements(By.className('nav-item'));
      await driver.get(logoutURL);
      expect(links.length).to.equal(4);
    });
    it('sidebar should contain four elements for organizer user', async function() {
      await driver.get(loginURL);
      await driver.sleep(1000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.sleep(1000);
      const links = await driver.findElements(By.className('nav-item'));
      await driver.get(logoutURL);
      expect(links.length).to.equal(4);
    });
    it('on organizer nav, clicking second button should return to /organizer/main', async function() {
      await driver.get(loginURL);
      await driver.sleep(1000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.findElement(By.id('returnToMain')).click();
      const curURL = await driver.getCurrentUrl();
      await driver.get(logoutURL);
      expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/organizer/main');
    });
    it('on organizer nav, clicking third button should go to /organizer/allusers (user config page)', async function() {
      await driver.get(loginURL);
      await driver.sleep(1000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.findElement(By.id('allusers')).click();
      const curURL = await driver.getCurrentUrl();
      await driver.get(logoutURL);
      expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/organizer/allusers');
    });
    it('on attendee nav, clicking second button should return to /main', async function() {
      await driver.get(loginURL);
      await driver.sleep(1000);
      await driver.findElement(By.name('uname')).sendKeys('test-attendee@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('11111111aA');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.findElement(By.id('attendeeMain')).click();
      const curURL = await driver.getCurrentUrl();
      await driver.get(logoutURL);
      expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/main');
    });
  });
  describe('courses', function() {
    //course creation
    describe('course-creation', function() {
      /*it('Attendees should get a 401 Unauthorized status if they try to create a course', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-attendee@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('11111111aA');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');
        const message401 = driver.findElement(By.class('pre')).getText();

        expect(message401).to.equal('Unauthorized');
        await driver.get(logoutURL);
      });*/
      it('Setting the registration deadline in the past should prompt an alert', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');

        //dummy course data
        await driver.findElement(By.id('coursename')).sendKeys('Test Course');
        await driver.findElement(By.id('topic')).sendKeys('Test');
        await driver.findElement(By.id('capacity')).sendKeys('20');
        await driver.findElement(By.id('location')).sendKeys("Meeting Room");

        //April 19, 2020, 11:59 pm
        await driver.findElement(By.id('deadline')).sendKeys('2020\t0419');

        //April 20, 2020 (before this course started)
        //8 AM - 10 AM (legal time)
        await driver.findElement(By.id('sessionDate1')).sendKeys('2020\t0420');
        await driver.findElement(By.id('startTime1')).sendKeys('08:00A');
        await driver.findElement(By.id('endTime1')).sendKeys('10:00A');

        await driver.findElement(By.id('submitButton')).click();
        await driver.sleep(1000);
        const error = await driver.switchTo().alert().getText();
        await driver.switchTo().alert().accept();

        expect(error).to.equal('Cannot schedule registration deadline in the past.');

        await driver.get(logoutURL);
      });
      it('Creating sessions out of chronological order should prompt an alert', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');

        //dummy course data
        await driver.findElement(By.id('coursename')).sendKeys('Test Course');
        await driver.findElement(By.id('topic')).sendKeys('Test');
        await driver.findElement(By.id('capacity')).sendKeys('20');
        await driver.findElement(By.id('location')).sendKeys("Meeting Room");

        //April 19, 2020, 11:59 pm
        await driver.findElement(By.id('deadline')).sendKeys('2020\t0820');

        //create session on September 1, 10 AM - 12 PM
        await driver.findElement(By.id('sessionDate1')).sendKeys('2020\t0901');
        await driver.findElement(By.id('startTime1')).sendKeys('10:00A');
        await driver.findElement(By.id('endTime1')).sendKeys('12:00P');
        //create new session
        await driver.findElement(By.id('addSession')).click();

        //create session on August 31, 10 AM - 12 PM
        await driver.findElement(By.id('sessionDate2')).sendKeys('2020\t0831');
        await driver.findElement(By.id('startTime2')).sendKeys('10:00A');
        await driver.findElement(By.id('endTime2')).sendKeys('12:00P');
        await driver.findElement(By.id('submitButton')).click();
        await driver.sleep(1000);
        const error = await driver.switchTo().alert().getText();
        await driver.switchTo().alert().accept();

        expect(error).to.equal('Sessions should be scheduled in chronological order');
        await driver.get(logoutURL);

      });
      it('Creating sessions with overlapping times should prompt an alert', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');

        //dummy course data
        await driver.findElement(By.id('coursename')).sendKeys('Test Course');
        await driver.findElement(By.id('topic')).sendKeys('Test');
        await driver.findElement(By.id('capacity')).sendKeys('20');
        await driver.findElement(By.id('location')).sendKeys("Meeting Room");

        //August 20, 2020, 11:59 pm
        await driver.findElement(By.id('deadline')).sendKeys('2020\t0820');

        //create session on September 1, 10 AM - 12 PM
        await driver.findElement(By.id('sessionDate1')).sendKeys('2020\t0901');
        await driver.findElement(By.id('startTime1')).sendKeys('10:00A');
        await driver.findElement(By.id('endTime1')).sendKeys('12:00P');

        //create new session on September 1, 11 AM - 1 PM
        await driver.findElement(By.id('addSession')).click();
        await driver.findElement(By.id('sessionDate2')).sendKeys('2020\t0901');
        await driver.findElement(By.id('startTime2')).sendKeys('11:00A');
        await driver.findElement(By.id('endTime2')).sendKeys('01:00P');

        await driver.findElement(By.id('submitButton')).click();

        const error = await driver.switchTo().alert().getText();
        await driver.switchTo().alert().accept();

        expect(error).to.equal('Sessions should not overlap (previous session must end before next session starts)');
        await driver.get(logoutURL);
      });
      it('Creating sessions with the end time before the start time should prompt an alert', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');

        //dummy course data
        await driver.findElement(By.id('coursename')).sendKeys('Test Course');
        await driver.findElement(By.id('topic')).sendKeys('Test');
        await driver.findElement(By.id('capacity')).sendKeys('20');
        await driver.findElement(By.id('location')).sendKeys("Meeting Room");

        //August 20, 2020, 11:59 pm
        await driver.findElement(By.id('deadline')).sendKeys('2020\t0820');

        //create session on September 1, 12 PM - 10 AM :thonk:
        await driver.findElement(By.id('sessionDate1')).sendKeys('2020\t0901');
        await driver.findElement(By.id('startTime1')).sendKeys('12:00P');
        await driver.findElement(By.id('endTime1')).sendKeys('10:00A');

        await driver.findElement(By.id('submitButton')).click();

        const error = await driver.switchTo().alert().getText();
        await driver.switchTo().alert().accept();
        expect(error).to.equal('End time of course must be after the start');

        await driver.get(logoutURL);

      });
      it('Setting the registration deadline after the first session should prompt an alert', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');

        //dummy course data
        await driver.findElement(By.id('coursename')).sendKeys('Test Course');
        await driver.findElement(By.id('topic')).sendKeys('Test');
        await driver.findElement(By.id('capacity')).sendKeys('20');
        await driver.findElement(By.id('location')).sendKeys("Meeting Room");

        //September 11, 2020, 11:59 pm
        await driver.findElement(By.id('deadline')).sendKeys('2020\t0911');

        //create session on September 1, 10 AM - 12 PM
        await driver.findElement(By.id('sessionDate1')).sendKeys('2020\t0901');
        await driver.findElement(By.id('startTime1')).sendKeys('10:00A');
        await driver.findElement(By.id('endTime1')).sendKeys('12:00P');

        await driver.findElement(By.id('submitButton')).click();

        const error = await driver.switchTo().alert().getText();
        await driver.switchTo().alert().accept();
        expect(error).to.equal('Cannot schedule registration deadline after the first course session.');

        await driver.get(logoutURL);
      });
      it('Successfully creating a new course will redirect back to the organizer main', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();
        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/new');

        //dummy course data
        await driver.findElement(By.id('coursename')).sendKeys('Test Course');
        await driver.findElement(By.id('topic')).sendKeys('Test');
        await driver.findElement(By.id('capacity')).sendKeys('20');
        await driver.findElement(By.id('location')).sendKeys("Meeting Room");

        //August 20, 2020, 11:59 pm
        await driver.findElement(By.id('deadline')).sendKeys('2020\t0820');

        //create session on September 1, 10 AM - 12 PM
        await driver.findElement(By.id('sessionDate1')).sendKeys('2020\t0901');
        await driver.findElement(By.id('startTime1')).sendKeys('10:00A');
        await driver.findElement(By.id('endTime1')).sendKeys('12:00P');

        await driver.findElement(By.id('submitButton')).click();

        const curURL = await driver.getCurrentUrl();
        await driver.get(logoutURL);
        expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/organizer/main');

      });
    });
    //course access
    describe('course-access', function() {
      //it('Users must be logged in to access a course path');
      //it('Accessing a non-existent course will return a status code')
      it('For a valid course, the title must show up', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();

        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/4');
        const title = driver.findElement(By.class('h1')).getText();
        await driver.get(logoutURL);
        expect(title).to.be.a('string').that.is.not.empty;

      });
      it('For a valid course, the topic must be present', async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();

        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/4');
        const topic = await driver.findElement(By.id('topic')).getText();
        await driver.get(logoutURL);
        expect(topic).to.be.a('string').that.is.not.empty;

      });
      it("For a valid course, the location must be present", async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();

        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/4');
        const location = await driver.findElement(By.id('location')).getText();
        await driver.get(logoutURL);
        expect(location).to.be.a('string').that.is.not.empty;
      });
      it("For a valid course, the maximum number of seats must be present", async function() {
        await driver.get(loginURL);
        await driver.sleep(1000);
        await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
        await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
        await driver.findElement(By.id('loginSubmit')).click();

        await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/4');
        const seats = await driver.findElement(By.id('seatNum')).getText();
        await driver.get(logoutURL);
        expect(seats).to.be.a('string').that.is.not.empty;
      });
      it("For a valid course, there should be at least one session with indicated date, start, and end times")
    });

    //course editing
    describe('local-course-editing', function() {

    });

    // email paths
    describe('no-users-enrolled', () => {
      await driver.get(loginURL);
      await driver.sleep(20000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/24');

      await driver.findElement(By.id('emailConf')).click();
      await driver.findElement(By.id('emailSendSubmit')).click();

      const message = await driver.findElement(By.id('redirectMessage')).getText();
      expect(message).to.equal('No users enrolled, no emails sent. You will be redirected to the course view.');
    });

    describe('no-users-enrolled', () => {
      await driver.get(loginURL);
      await driver.sleep(20000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/23');

      await driver.findElement(By.id('emailConf')).click();
      await driver.findElement(By.id('emailSendSubmit')).click();

      const message = await driver.findElement(By.id('redirectMessage')).getText();
      await driver.get(logoutURL);
      expect(message).to.equal('No users enrolled, no emails sent. You will be redirected to the course view.');
    });

    describe('email-success', () => {
      await driver.get(loginURL);
      await driver.sleep(20000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/23');

      await driver.findElement(By.id('emailConf')).click();
      await driver.findElement(By.id('emailSendSubmit')).click();

      const message = await driver.findElement(By.id('redirectMessage')).getText();
      await driver.get(logoutURL);
      expect(message).to.equal('Email sent successfully! You will be redirected to the course view.');
    });

    // a true failure will result in an instance when the api fails and throws an err
    // a case where this happens is if the api key is messing
    // to test remove the api key

    // describe('email-api-fail', () => {
    //   await driver.get(loginURL);
    //   await driver.sleep(20000);
    //   await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
    //   await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
    //   await driver.findElement(By.id('loginSubmit')).click();
    //   await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/courses/24');

    //   await driver.findElement(By.id('emailConf')).click();
    //   await driver.findElement(By.id('emailSendSubmit')).click();

    //   const message = await driver.findElement(By.id('redirectMessage')).getText();
    //   await driver.get(logoutURL);
    //   expect(message).to.equal('ERROR: EMAIL NOT SENT! API failure. You will be redirected to the course view.');
    // });

    describe('disable-user', () => {
      await driver.get(loginURL);
      await driver.sleep(20000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/organizer/allusers');

      await driver.findElement(By.id('approvedFalse3')).click();
      await driver.findElement(By.name('updateUserData')).click();

      const message = await driver.findElement(By.id('redirectMessage')).getText();
      await driver.get(logoutURL);
      expect(message).to.equal('User data has been successfully updated! You will be redirected to the main courses page.');
      
      await driver.get(loginURL);
      await driver.findElement(By.name('uname')).sendKeys('mla283@sfu.ca');
      await driver.findElement(By.name('pwd')).sendKeys('Password123!');
      await driver.findElement(By.id('loginSubmit')).click();

      const curURL = await driver.getCurrentUrl();
      expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/login');
    });

    describe('approve-user', () => {
      await driver.get(loginURL);
      await driver.sleep(20000);
      await driver.findElement(By.name('uname')).sendKeys('test-organizer@bgcengineering.ca');
      await driver.findElement(By.name('pwd')).sendKeys('teamBPtestpassword1');
      await driver.findElement(By.id('loginSubmit')).click();
      await driver.get('https://cmpt276-bgc-coursys.herokuapp.com/organizer/allusers');

      await driver.findElement(By.id('approvedTrue3')).click();
      await driver.findElement(By.name('updateUserData')).click();

      const message = await driver.findElement(By.id('redirectMessage')).getText();
      await driver.get(logoutURL);
      expect(message).to.equal('User data has been successfully updated! You will be redirected to the main courses page.');
      
      await driver.get(loginURL);
      await driver.findElement(By.name('uname')).sendKeys('mla283@sfu.ca');
      await driver.findElement(By.name('pwd')).sendKeys('Password123!');
      await driver.findElement(By.id('loginSubmit')).click();

      const curURL = await driver.getCurrentUrl();
      expect(curURL).to.equal('https://cmpt276-bgc-coursys.herokuapp.com/main');
      // should check mla283@sfu.ca's inbox to see email received
    });
});




  after(async () => driver.quit());
});
