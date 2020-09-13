import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getCustomRepository, getRepository } from 'typeorm';

import uploadConfig from '../config/upload';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  transactionsCsvFileName: string;
}

class ImportTransactionsService {
  async execute({ transactionsCsvFileName }: Request): Promise<Transaction[]> {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const categories: Map<string, Category> = new Map();
    let transactions: Transaction[] = [];

    const readCSVStream = fs.createReadStream(
      path.join(uploadConfig.directory, transactionsCsvFileName),
    );

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
      delimiter: ',',
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', async line => {
      const category = categoryRepository.create({
        title: line[3],
      });

      const transaction = transactionRepository.create({
        title: line[0],
        type: line[1],
        value: Number(line[2]),
        category,
      });

      categories.set(line[3], category);
      transactions.push(transaction);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    await Promise.all(
      Array.from(categories.values()).map(async category => {
        const foundCategory = await categoryRepository.findOne({
          where: { title: category.title },
        });

        if (foundCategory) {
          return categories.set(category.title, foundCategory);
        }

        return categoryRepository.save(category);
      }),
    );

    transactions = transactions.map(transaction => ({
      ...transaction,
      category: categories.get(transaction.category.title) || new Category(),
    }));

    return transactionRepository.save(transactions);
  }
}

export default ImportTransactionsService;
