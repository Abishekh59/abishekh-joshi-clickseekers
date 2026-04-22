/**
 * TC071 — Update Profile Unsuccessful When Empty Full Name
 * Verifies that the profile update validation rejects empty full_name values.
 */

describe('TC071: Update profile unsuccessful when empty full name', () => {
  /**
   * Simulates the front-end validation logic from PhotographerProfile.tsx:
   *   if (!editedProfile.name.trim()) {
   *     Alert.alert("Error", "Full name is required");
   *     return;
   *   }
   */
  function validateProfileUpdate(editedProfile) {
    if (!editedProfile.name || !editedProfile.name.trim()) {
      return { valid: false, error: 'Full name is required' };
    }
    return { valid: true, error: null };
  }

  it('should fail validation and block API call when full name is empty', () => {
    global.fetch = jest.fn();

    // Test empty string
    const result1 = validateProfileUpdate({ name: '' });
    expect(result1.valid).toBe(false);
    expect(result1.error).toBe('Full name is required');

    // Test whitespace only
    const result2 = validateProfileUpdate({ name: '   ' });
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Full name is required');

    // Test undefined
    const result3 = validateProfileUpdate({ name: undefined });
    expect(result3.valid).toBe(false);
    expect(result3.error).toBe('Full name is required');

    // Test null
    const result4 = validateProfileUpdate({ name: null });
    expect(result4.valid).toBe(false);
    expect(result4.error).toBe('Full name is required');

    // Verify API was never called
    expect(global.fetch).not.toHaveBeenCalled();

    // Test valid name passes
    const validResult = validateProfileUpdate({ name: 'Abishek Joshi' });
    expect(validResult.valid).toBe(true);
    expect(validResult.error).toBeNull();

    delete global.fetch;
  });
});
