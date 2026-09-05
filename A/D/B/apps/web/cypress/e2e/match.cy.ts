describe('Ninor E2E - User Match Flow', () => {
  beforeEach(() => {
    // Clear local storage to simulate a fresh user
    cy.clearLocalStorage();
  });

  it('Allows a user to specify age and gender and proceed to match', () => {
    cy.intercept('POST', '**/profile/upsert').as('upsertProfile');

    cy.visit('/');
    cy.contains('Ninor Video Chat');

    // Select profile data
    cy.get('input[type="number"]').clear().type('25');
    cy.get('select').select('female');
    
    // Click matching
    cy.contains('Continue to matching').click();
    
    // Validate profile upsert API was called successfully
    cy.wait('@upsertProfile').its('response.statusCode').should('eq', 200);

    // Verify redirect to match screen
    cy.url().should('include', '/match');
    cy.contains('Matching');
    cy.contains('Status');
  });

  it('Emergency exit effectively drops user back to homepage', () => {
    // Fake local storage payload to bypass hompage profile gate
    cy.window().then((win) => {
      win.localStorage.setItem('ninor_profile_v1', JSON.stringify({
        userId: '12345-uuid',
        age: 22,
        gender: 'male'
      }));
    });
    
    cy.visit('/match');
    cy.get('button').contains('Emergency exit').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
