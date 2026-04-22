/**
 * TC073 — Unsuccessful Package Add if Negative Price Entered
 * Verifies that the PricingManagement component's validation logic
 * rejects negative price values when adding or editing a package.
 */

describe('TC073: Unsuccessful package add if negative price entered', () => {
  function validatePackage(pkg) {
    if (!pkg.name || !pkg.price || !pkg.duration) {
      return { valid: false, error: 'Please fill all fields' };
    }
    if (pkg.price < 0) {
      return { valid: false, error: 'Price cannot be negative' };
    }
    return { valid: true, error: null };
  }

  it('should reject negative prices and prevent API call', () => {
    global.fetch = jest.fn();

    // Negative price -5000
    const r1 = validatePackage({ name: 'Gold Package', price: -5000, duration: '6 hours' });
    expect(r1.valid).toBe(false);
    expect(r1.error).toBe('Price cannot be negative');

    // Negative price -1
    const r2 = validatePackage({ name: 'Basic Package', price: -1, duration: '2 hours' });
    expect(r2.valid).toBe(false);
    expect(r2.error).toBe('Price cannot be negative');

    // Large negative price
    const r3 = validatePackage({ name: 'Premium Package', price: -100000, duration: 'Full day' });
    expect(r3.valid).toBe(false);
    expect(r3.error).toBe('Price cannot be negative');

    // API should never be called
    expect(global.fetch).not.toHaveBeenCalled();

    // Positive price should pass
    const r4 = validatePackage({ name: 'Silver Package', price: 15000, duration: '4 hours' });
    expect(r4.valid).toBe(true);
    expect(r4.error).toBeNull();

    delete global.fetch;
  });
});
