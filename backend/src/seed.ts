import * as dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // ignore if custom DNS cannot be set
}

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { Role, TableStatus } from './common/enums';
import { toMillimes } from './common/money';
import { newQrToken } from './common/token';
import { Category, CategoryDocument } from './categories/category.schema';
import { Product, ProductDocument } from './products/product.schema';
import { Table, TableDocument } from './tables/table.schema';
import { User, UserDocument } from './users/user.schema';

const USERS = [
  { name: 'Admin', username: 'admin', password: 'Admin123!', role: Role.ADMIN },
  { name: 'Caissier', username: 'caissier', password: 'Caissier123!', role: Role.CAISSIER },
  { name: 'Contoiriste', username: 'contoiriste', password: 'Contoir123!', role: Role.CONTOIRISTE },
];
const CATEGORIES = ['Boissons chaudes', 'Boissons fraîches', 'Plats', 'Desserts'];
const PRODUCTS: Array<[string, string, number, string]> = [
  ['Café expresso', 'Boissons chaudes', 2.0, 'Café court et corsé'],
  ['Café crème', 'Boissons chaudes', 3.0, 'Café allongé de lait'],
  ['Thé à la menthe', 'Boissons chaudes', 2.5, 'Thé vert, menthe fraîche'],
  ['Jus d’orange', 'Boissons fraîches', 5.5, 'Pressé minute'],
  ['Limonade maison', 'Boissons fraîches', 4.5, 'Citron et menthe'],
  ['Eau minérale 50cl', 'Boissons fraîches', 1.5, ''],
  ['Pizza margherita', 'Plats', 14.5, 'Tomate, mozzarella, basilic'],
  ['Spaghetti bolognaise', 'Plats', 16.0, 'Sauce à la viande'],
  ['Salade tunisienne', 'Plats', 9.5, 'Tomate, concombre, thon, olives'],
  ['Tiramisu', 'Desserts', 8.0, ''],
  ['Crêpe chocolat', 'Desserts', 7.0, ''],
  ['Makroudh', 'Desserts', 3.5, 'Pâtisserie aux dattes'],
];

async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const users = app.get<Model<UserDocument>>(getModelToken(User.name));
  const tables = app.get<Model<TableDocument>>(getModelToken(Table.name));
  const cats = app.get<Model<CategoryDocument>>(getModelToken(Category.name));
  const products = app.get<Model<ProductDocument>>(getModelToken(Product.name));

  for (const u of USERS) {
    if (await users.exists({ username: u.username })) continue;
    const { password, ...rest } = u;
    await users.create({ ...rest, passwordHash: await bcrypt.hash(password, 10), active: true });
  }
  for (let n = 1; n <= 6; n++) {
    if (await tables.exists({ number: n })) continue;
    await tables.create({ number: n, qrToken: newQrToken(), status: TableStatus.AVAILABLE });
  }
  const catIds = new Map<string, unknown>();
  for (const [i, name] of CATEGORIES.entries()) {
    const c = (await cats.findOne({ name })) ?? (await cats.create({ name, sortOrder: i + 1 }));
    catIds.set(name, c._id);
  }
  for (const [name, cat, price, description] of PRODUCTS) {
    if (await products.exists({ name })) continue;
    await products.create({ name, description, price: toMillimes(price), categoryId: catIds.get(cat), available: true });
  }
  const all = await tables.find().sort({ number: 1 });
  // eslint-disable-next-line no-console
  console.log('Seed done. Logins: admin/Admin123!  caissier/Caissier123!  contoiriste/Contoir123!');
  // eslint-disable-next-line no-console
  all.forEach((t) => console.log(`Table ${t.number}: ${t.qrToken}`));
  await app.close();
}
void seed();
