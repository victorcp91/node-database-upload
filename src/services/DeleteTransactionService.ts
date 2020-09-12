import { getCustomRepository } from 'typeorm';
import TransactionRopository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionRopository = getCustomRepository(TransactionRopository);
    const transaction = await transactionRopository.findOne({ where: { id } });
    if (!transaction) {
      throw new AppError('Transaction not found');
    }
    await transactionRopository.remove(transaction);
  }
}

export default DeleteTransactionService;
