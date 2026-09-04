Cypress.Commands.add('login', (email?: string, password?: string) => {
  const userEmail = email || Cypress.env('testEmail');
  const userPassword = password || Cypress.env('testPassword');

  cy.session([userEmail, userPassword], () => {
    cy.visit('/');
    cy.get('input[name="email"]').type(userEmail);
    cy.get('input[name="password"]').type(userPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
    cy.getCookie('token').should('exist');
  });
});

Cypress.Commands.add('register', () => {
  const email = `e2e-${Date.now()}@test.com`;
  cy.visit('/');
  cy.contains('Register').click();
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type('TestPass123!');
  cy.get('input[name="displayName"]').type('E2E User');
  cy.get('input[name="age"]').type('25');
  cy.get('select[name="gender"]').select('male');
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/register');
  cy.wrap(email).as('registeredEmail');
});

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

declare namespace Cypress {
  interface Chainable {
    login(email?: string, password?: string): Chainable<void>;
    register(): Chainable<void>;
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
  }
}
