describe('Video Chat Flow', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should display video chat page', () => {
    cy.visit('/video-chat');
    cy.getByTestId('video-chat-container').should('be.visible');
    cy.getByTestId('start-matching-btn').should('be.visible');
  });

  it('should show match queue when searching', () => {
    cy.visit('/video-chat');
    cy.getByTestId('start-matching-btn').click();
    cy.getByTestId('searching-indicator').should('be.visible');
    cy.getByTestId('cancel-btn').should('be.visible');
  });

  it('should display video controls', () => {
    cy.visit('/video-chat');
    cy.getByTestId('camera-toggle').should('be.visible');
    cy.getByTestId('mic-toggle').should('be.visible');
  });

  it('should show session timer when in call', () => {
    cy.visit('/video-chat');
    cy.getByTestId('session-timer').should('be.visible');
    cy.getByTestId('session-timer').invoke('text').should('match', /\d+:\d+/);
  });

  it('should allow muting audio', () => {
    cy.visit('/video-chat');
    cy.getByTestId('mic-toggle').click();
    cy.getByTestId('mic-toggle').should('have.class', 'muted');
  });

  it('should allow toggling camera', () => {
    cy.visit('/video-chat');
    cy.getByTestId('camera-toggle').click();
    cy.getByTestId('camera-toggle').should('have.class', 'camera-off');
  });

  it('should display extend button during session', () => {
    cy.visit('/video-chat');
    cy.getByTestId('extend-btn').should('be.visible');
  });

  it('should show report modal', () => {
    cy.visit('/video-chat');
    cy.getByTestId('report-btn').click();
    cy.getByTestId('report-modal').should('be.visible');
    cy.getByTestId('report-reason-select').should('exist');
  });

  it('should submit a report', () => {
    cy.visit('/video-chat');
    cy.getByTestId('report-btn').click();
    cy.getByTestId('report-reason-select').select('harassment');
    cy.getByTestId('report-submit-btn').click();
    cy.contains('Report submitted').should('be.visible');
  });

  it('should allow ending a session', () => {
    cy.visit('/video-chat');
    cy.getByTestId('end-call-btn').click();
    cy.getByTestId('post-call-overlay').should('be.visible');
  });
});
