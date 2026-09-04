import {
  registerSchema,
  loginSchema,
  ageSchema,
  displayNameSchema,
  emailSchema,
  passwordSchema,
  updateProfileSchema,
} from '../utils/validation';

describe('Validation Schemas', () => {
  describe('ageSchema', () => {
    it('should accept age 18-120', () => {
      expect(ageSchema.parse(18)).toBe(18);
      expect(ageSchema.parse(25)).toBe(25);
      expect(ageSchema.parse(120)).toBe(120);
    });

    it('should reject age under 13', () => {
      expect(() => ageSchema.parse(12)).toThrow();
      expect(() => ageSchema.parse(0)).toThrow();
      expect(() => ageSchema.parse(-5)).toThrow();
    });

    it('should reject age over 120', () => {
      expect(() => ageSchema.parse(121)).toThrow();
      expect(() => ageSchema.parse(200)).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
      expect(emailSchema.parse('user+tag@domain.co.uk')).toBe('user+tag@domain.co.uk');
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('not-an-email')).toThrow();
      expect(() => emailSchema.parse('')).toThrow();
      expect(() => emailSchema.parse('@')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should accept strong passwords', () => {
      expect(() => passwordSchema.parse('StrongPass1!')).not.toThrow();
      expect(() => passwordSchema.parse('Valid123!')).not.toThrow();
    });

    it('should reject short passwords', () => {
      expect(() => passwordSchema.parse('Ab1!')).toThrow();
    });

    it('should reject passwords without uppercase', () => {
      expect(() => passwordSchema.parse('weakpass1!')).toThrow();
    });

    it('should reject passwords without numbers', () => {
      expect(() => passwordSchema.parse('WeakPass!')).toThrow();
    });
  });

  describe('displayNameSchema', () => {
    it('should accept valid names', () => {
      expect(displayNameSchema.parse('John')).toBe('John');
      expect(displayNameSchema.parse('Test User')).toBe('Test User');
    });

    it('should reject names over 50 characters', () => {
      expect(() => displayNameSchema.parse('a'.repeat(51))).toThrow();
    });

    it('should reject empty names', () => {
      expect(() => displayNameSchema.parse('')).toThrow();
    });
  });

  describe('registerSchema', () => {
    const validData = {
      email: 'newuser@example.com',
      password: 'StrongPass1!',
      displayName: 'New User',
      age: 25,
      gender: 'male',
      acceptTerms: true,
      acceptPrivacyPolicy: true,
      parentalConsent: true,
    };

    it('should accept valid registration data', () => {
      const result = registerSchema.parse(validData);
      expect(result.email).toBe('newuser@example.com');
    });

    it('should reject missing fields', () => {
      expect(() => registerSchema.parse({})).toThrow();
    });

    it('should reject underage registration without parental consent', () => {
      expect(() => registerSchema.parse({ ...validData, age: 15, parentalConsent: false })).toThrow();
      expect(() => registerSchema.parse({ ...validData, age: 13, parentalConsent: false })).toThrow();
    });

    it('should reject invalid email in registration', () => {
      expect(() => registerSchema.parse({ ...validData, email: 'bad' })).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = loginSchema.parse({
        email: 'user@example.com',
        password: 'TestPass1!',
      });
      expect(result.email).toBe('user@example.com');
    });

    it('should reject missing password', () => {
      expect(() => loginSchema.parse({ email: 'user@example.com' })).toThrow();
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept partial updates', () => {
      const result = updateProfileSchema.parse({ displayName: 'Updated' });
      expect(result.displayName).toBe('Updated');
    });

    it('should accept empty object', () => {
      const result = updateProfileSchema.parse({});
      expect(result).toEqual({});
    });

    it('should reject invalid bio length', () => {
      expect(() => updateProfileSchema.parse({ bio: 'a'.repeat(501) })).toThrow();
    });
  });
});
