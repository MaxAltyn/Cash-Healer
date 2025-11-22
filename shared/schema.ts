import { pgTable, serial, varchar, timestamp, text, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Таблица пользователей Telegram
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: varchar("telegram_id", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Типы услуг
export type ServiceType = "financial_detox" | "financial_modeling";

// Статусы заказов
export type OrderStatus = 
  | "created"           // Создан
  | "payment_pending"   // Ожидает оплаты
  | "payment_confirmed" // Оплата подтверждена
  | "form_sent"         // Ссылка на форму отправлена
  | "form_filled"       // Форма заполнена
  | "processing"        // В обработке
  | "completed"         // Завершен
  | "cancelled";        // Отменен

// Таблица заказов
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serviceType: varchar("service_type", { length: 50 }).$type<ServiceType>().notNull(),
  status: varchar("status", { length: 50 }).$type<OrderStatus>().default("created").notNull(),
  price: integer("price").notNull(), // Цена в копейках
  formUrl: varchar("form_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Статусы платежей
export type PaymentStatus = 
  | "pending"    // Ожидает оплаты
  | "waiting_for_capture" // Ожидает подтверждения
  | "succeeded"  // Успешно
  | "canceled";  // Отменен

// Таблица платежей YooKassa
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  yookassaPaymentId: varchar("yookassa_payment_id", { length: 255 }).unique(),
  amount: integer("amount").notNull(), // Сумма в копейках
  currency: varchar("currency", { length: 10 }).default("RUB").notNull(),
  status: varchar("status", { length: 50 }).$type<PaymentStatus>().default("pending").notNull(),
  paymentUrl: varchar("payment_url", { length: 500 }),
  metadata: text("metadata"), // JSON данные
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

// Отношения
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// Таблица финансовых моделей (для услуги Financial Modeling)
export const financialModels = pgTable("financial_models", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  currentBalance: integer("current_balance").notNull().default(0), // Текущий баланс в рублях
  nextIncome: integer("next_income").notNull().default(0), // Следующий доход в рублях
  nextIncomeDate: varchar("next_income_date", { length: 50 }), // Дата следующего дохода (ISO string)
  expenses: text("expenses"), // JSON массив категорий расходов [{name, amount}]
  wishes: text("wishes"), // JSON массив желаний [{name, price}]
  totalExpenses: integer("total_expenses").default(0), // Сумма всех расходов в рублях
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const financialModelsRelations = relations(financialModels, ({ one }) => ({
  user: one(users, {
    fields: [financialModels.userId],
    references: [users.id],
  }),
}));
