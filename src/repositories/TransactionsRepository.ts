import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce(
      (p, c) => ({
        income: p.income + (c.type === 'income' ? c.value : 0),
        outcome: p.outcome + (c.type === 'outcome' ? c.value : 0),
        total: p.total + (c.type === 'income' ? c.value : -c.value),
      }),
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balance;
  }
}

export default TransactionsRepository;
