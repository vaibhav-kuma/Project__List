describe('User Registration and Login', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the login page', () => {
    cy.get('h1').should('exist');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
  });

  it('should navigate to register page', () => {
    cy.contains('Register').click();
    cy.get('input[name="displayName"]').should('be.visible');
    cy.get('input[name="age"]').should('be.visible');
  });

  it('should show validation errors for empty form', () => {
    cy.get('button[type="submit"]').click();
    cy.contains('required').should('exist');
  });

  it('should show error for invalid email format', () => {
    cy.get('input[name="email"]').type('not-an-email');
    cy.get('input[name="password"]').type('TestPass123!');
    cy.get('button[type="submit"]').click();
    cy.contains('invalid', { matchCase: false }).should('exist');
  });

  it('should complete registration flow', () => {
    cy.register();
    cy.url().should('not.include', '/register');
  });

  it('should login with registered credentials', () => {
    cy.register().then(() => {
      cy.get('@registeredEmail').then((email) => {
        cy.login(email as string, 'TestPass123!');
      });
    });
  });

  it('should show error for wrong password', () => {
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid', { matchCase: false }).should('exist');
  });
});
