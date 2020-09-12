import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransactionData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsData: CSVTransactionData[] = [];

    const categories: string[] = [];

    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;
      if (!title || !type || !category) return;

      categories.push(category);
      transactionsData.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesRepository = getRepository(Category);

    const foundCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const foundCategoriesTitles = foundCategories.map(
      category => category.title,
    );

    const newCategoriesTitles = categories
      .filter(category => !foundCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      newCategoriesTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const allCategories = [...foundCategories, ...newCategories];

    const newTransactions = transactionsRepository.create(
      transactionsData.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    await fs.promises.unlink(filePath);

    return newTransactions;
  }
}

export default ImportTransactionsService;
