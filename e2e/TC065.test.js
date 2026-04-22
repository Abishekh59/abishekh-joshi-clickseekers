describe('TC065: User valid login', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: 'YES', location: 'always' }
    });
    await device.disableSynchronization();
  });

  it('should perform valid login successfully', async () => {
    console.log('--- RUNNING [TC005] User valid login ---');

    // 1. Home Page: Tap "Get Started"
    console.log('[TC005] Step 1: Navigating from Home Page');
    await waitFor(element(by.id('get-started-button'))).toBeVisible().withTimeout(20000);
    await element(by.id('get-started-button')).tap();

    // 2. Role Page: Tap "I'm a Photographer"
    console.log('[TC005] Step 2: Selecting Role');
    await waitFor(element(by.id('photographer-role-button'))).toBeVisible().withTimeout(10000);
    await element(by.id('photographer-role-button')).tap();

    // 3. Register Page: Tap "Log in" link
    await waitFor(element(by.id('login-link'))).toBeVisible().withTimeout(10000);
    await element(by.id('login-link')).tap();

    // 4. Login Page: Enter valid credentials
    console.log('[TC005] Step 3: Entering valid credentials');
    await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(10000);
    await element(by.id('email-input')).replaceText('joshiabishek987@gmail.com');
    await element(by.id('password-input')).replaceText('abishek@123');
    await element(by.id('login-button')).tap();

    // 5. Verification: Check dashboard reach
    console.log('[TC005] Step 4: Verifying Dashboard Appearance');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await device.takeScreenshot('TC005-dashboard-success');
    await expect(element(by.id('photographer-dashboard'))).toExist();

    console.log('--- [TC065] COMPLETED SUCCESSFULLY ---');
  });
});
