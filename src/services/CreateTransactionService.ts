import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();
      if (total - value < 0) {
        throw new AppError('Not enough balance');
      }
    }

    let foundCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    console.log('foundCategory', category || false);
    if (!foundCategory) {
      const newCategory = await categoryRepository.create({ title: category });
      await categoryRepository.save(newCategory);
      foundCategory = newCategory;
      console.log('newCategory', foundCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category: foundCategory,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
