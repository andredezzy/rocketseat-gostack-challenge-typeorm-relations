import { injectable, inject } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found.');
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (findProducts.length <= 0) {
      throw new AppError('Products can not be empty.');
    }

    findProducts.forEach(findProduct => {
      const { quantity } = products.find(
        find => find.id === findProduct.id,
      ) as Product;

      if (findProduct.quantity < quantity) {
        throw new AppError(
          `Insufficient quantity in product '${findProduct.name}'.`,
        );
      }
    });

    const order = this.ordersRepository.create({
      customer,
      products: findProducts.map(findProduct => {
        const { quantity } = products.find(
          find => find.id === findProduct.id,
        ) as Product;

        return {
          product_id: findProduct.id,
          price: findProduct.price,
          quantity,
        };
      }),
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
