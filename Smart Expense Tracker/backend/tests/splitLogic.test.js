const splitController = require('../src/controllers/splitController');

// Mock Models
const { Expense, SharedExpense, Settlement } = require('../src/models');

jest.mock('../src/models', () => ({
    Expense: { findAll: jest.fn() },
    SharedExpense: { findAll: jest.fn() },
    Settlement: { findAll: jest.fn() },
    User: {} // Stub
}));
jest.mock('../src/config/db', () => ({
    sequelize: {
        fn: jest.fn(),
        col: jest.fn(),
        transaction: jest.fn()
    }
}));

describe('Split Logic Calculation', () => {
    let req, res;

    beforeEach(() => {
        req = { params: { groupId: 'g1' } };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    it('should calculate balances correctly for a simple paid expense', async () => {
        // Scenario: User A paid 100. Shared between A (50) and B (50).
        // Balance A: +100 (paid) - 50 (share) = +50
        // Balance B: 0 (paid) - 50 (share) = -50

        Expense.findAll.mockResolvedValue([
            { userId: 'A', amount: 100 }
        ]);

        SharedExpense.findAll.mockResolvedValue([
            { userId: 'A', amountOwed: 50 },
            { userId: 'B', amountOwed: 50 }
        ]);

        Settlement.findAll.mockResolvedValue([]);

        await splitController.getGroupBalances(req, res);

        expect(res.json).toHaveBeenCalledWith({
            'A': 50,
            'B': -50
        });
    });

    it('should calculate balances correctly with a settlement', async () => {
        // Scenario: Previous (A: +50, B: -50). B pays A 30.
        // Balance A: +50 + (received 30 ?? Wait, logic check)
        // Logic: Payer (B) "paid", so Balance goes UP (+30 to -50 = -20).
        //        Payee (A) "received", so Balance goes DOWN (-30 to +50 = +20).
        // wait, let's re-verify the logic.
        // Balances represent "Net Claim". Positive means "I am owed money". Negative means "I owe money".

        // Logic Review in Controller:
        // balances[settle.payerId] += amount; // Payer reduces debt (gets closer to 0 or positive)
        // balances[settle.payeeId] -= amount; // Payee reduces claim (gets closer to 0 or negative)

        // So:
        // A (starts +50): -30 = +20. Correct. (Only needs 20 more)
        // B (starts -50): +30 = -20. Correct. (Only owes 20 more)

        Expense.findAll.mockResolvedValue([
            { userId: 'A', amount: 100 }
        ]);

        SharedExpense.findAll.mockResolvedValue([
            { userId: 'A', amountOwed: 50 },
            { userId: 'B', amountOwed: 50 }
        ]);

        Settlement.findAll.mockResolvedValue([
            { payerId: 'B', payeeId: 'A', amount: 30 }
        ]);

        await splitController.getGroupBalances(req, res);

        expect(res.json).toHaveBeenCalledWith({
            'A': 20,
            'B': -20
        });
    });

    it('should handle complex multiple expenses', async () => {
        // A pays 60 (shared 20, 20, 20) -> A:+40, B:-20, C:-20
        // B pays 30 (shared 10, 10, 10) -> B:+20 (-10 share) = +10 net change?

        // Expense 1: A pays 60. Share: A=20, B=20, C=20.
        // Expense 2: B pays 30. Share: A=10, B=10, C=10.

        // Totals:
        // Paid: A=60, B=30, C=0.
        // Shares Owed: A=(20+10)=30, B=(20+10)=30, C=(20+10)=30.

        // Balances:
        // A: 60 - 30 = +30
        // B: 30 - 30 = 0
        // C: 0 - 30 = -30

        Expense.findAll.mockResolvedValue([
            { userId: 'A', amount: 60 },
            { userId: 'B', amount: 30 }
        ]);

        SharedExpense.findAll.mockResolvedValue([
            { userId: 'A', amountOwed: 20 },
            { userId: 'B', amountOwed: 20 },
            { userId: 'C', amountOwed: 20 },
            { userId: 'A', amountOwed: 10 },
            { userId: 'B', amountOwed: 10 },
            { userId: 'C', amountOwed: 10 }
        ]);

        Settlement.findAll.mockResolvedValue([]);

        await splitController.getGroupBalances(req, res);

        expect(res.json).toHaveBeenCalledWith({
            'A': 30,
            'B': 0,
            'C': -30
        });
    });
});
