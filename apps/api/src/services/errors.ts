export class LedgerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'LedgerError';
    this.statusCode = statusCode;
  }
}

export class InsufficientFundsError extends LedgerError {
  constructor(message = 'Insufficient funds for transfer') {
    super(message, 400);
    this.name = 'InsufficientFundsError';
  }
}

export class UnauthorizedAccountAccessError extends LedgerError {
  constructor(message = 'Forbidden: You do not own the debit account') {
    super(message, 403);
    this.name = 'UnauthorizedAccountAccessError';
  }
}

export class OptimisticLockError extends LedgerError {
  constructor(message = 'Account was updated concurrently. Please retry.') {
    super(message, 409);
    this.name = 'OptimisticLockError';
  }
}

export class AccountNotFoundError extends LedgerError {
  constructor(message = 'Account not found') {
    super(message, 404);
    this.name = 'AccountNotFoundError';
  }
}

export class InvalidAmountError extends LedgerError {
  constructor(message = 'Invalid amount: must be positive integer and within limits') {
    super(message, 400);
    this.name = 'InvalidAmountError';
  }
}
