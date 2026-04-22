describe('TC066: User invalid login', () => {
  beforeEach(async () => {
    await device.launchApp({
      newInstance: true,
      delete: true,
      permissions: { notifications: 'YES', location: 'always' }
    });
    await device.disableSynchronization();
  });

  it('should show error alert for invalid credentials', async () => {
    console.log('--- RUNNING [TC006] User invalid login ---');

    // 1. Home Page: Tap "Get Started"
    console.log('[TC006] Step 1: Navigating from Home Page');
    await waitFor(element(by.id('get-started-button'))).toBeVisible().withTimeout(15000);
    await element(by.id('get-started-button')).tap();

    // 2. Role Page: Tap "I'm a Photographer"
    console.log('[TC006] Step 2: Selecting Role');
    await waitFor(element(by.id('photographer-role-button'))).toBeVisible().withTimeout(10000);
    await element(by.id('photographer-role-button')).tap();

    // 3. Register Page: Tap "Log in" link
    await waitFor(element(by.id('login-link'))).toBeVisible().withTimeout(10000);
    await element(by.id('login-link')).tap();

    // 4. Login Page: Enter INVALID credentials
    console.log('[TC006] Step 3: Entering INVALID credentials');
    await waitFor(element(by.id('email-input'))).toBeVisible().withTimeout(10000);
    await element(by.id('email-input')).replaceText('wrong@gmail.com');
    await element(by.id('password-input')).replaceText('wrongpass');
    await element(by.id('login-button')).tap();

    // 5. Verification: Check for error alert
    console.log('[TC006] Step 4: Verifying Error Alert');
    await waitFor(element(by.text('Login Failed'))).toBeVisible().withTimeout(10000);
    await element(by.text('OK')).tap();

    console.log('--- [TC066] COMPLETED SUCCESSFULLY ---');
  });
});
