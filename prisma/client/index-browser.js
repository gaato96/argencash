
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.2.1
 * Query Engine version: 4123509d24aa4dede1e864b46351bf2790323b69
 */
Prisma.prismaVersion = {
  client: "6.2.1",
  engine: "4123509d24aa4dede1e864b46351bf2790323b69"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  plan: 'plan',
  commissionRate: 'commissionRate',
  enabledModules: 'enabledModules',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  currency: 'currency',
  type: 'type',
  ownership: 'ownership',
  bank: 'bank',
  alias: 'alias',
  cbu: 'cbu',
  pin: 'pin',
  notes: 'notes',
  isPurchasing: 'isPurchasing',
  username: 'username',
  password: 'password',
  initialBalance: 'initialBalance',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountMovementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  accountId: 'accountId',
  currency: 'currency',
  amount: 'amount',
  type: 'type',
  referenceId: 'referenceId',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.OperationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  status: 'status',
  mainAmount: 'mainAmount',
  mainCurrency: 'mainCurrency',
  secondaryAmount: 'secondaryAmount',
  exchangeRate: 'exchangeRate',
  cashAmount: 'cashAmount',
  transferAmount: 'transferAmount',
  createdById: 'createdById',
  cashSessionId: 'cashSessionId',
  notes: 'notes',
  category: 'category',
  commissionAmount: 'commissionAmount',
  commissionAccountId: 'commissionAccountId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UsdStockEntryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  amount: 'amount',
  rate: 'rate',
  remaining: 'remaining',
  operationId: 'operationId',
  createdAt: 'createdAt'
};

exports.Prisma.CashSessionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  status: 'status',
  openedById: 'openedById',
  openedAt: 'openedAt',
  openingBalances: 'openingBalances',
  closedById: 'closedById',
  closedAt: 'closedAt',
  expectedBalances: 'expectedBalances',
  actualBalances: 'actualBalances',
  difference: 'difference',
  withdrawalsSummary: 'withdrawalsSummary',
  commissionsSummary: 'commissionsSummary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RecaudadoraScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  clientName: 'clientName',
  commissionRate: 'commissionRate',
  dailyAccumulated: 'dailyAccumulated',
  lastResetAt: 'lastResetAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RecaudadoraMovementScalarFieldEnum = {
  id: 'id',
  recaudadoraId: 'recaudadoraId',
  amount: 'amount',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.CurrentAccountScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  phone: 'phone',
  notes: 'notes',
  balanceARS: 'balanceARS',
  balanceUSD: 'balanceUSD',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CurrentAccountMovementScalarFieldEnum = {
  id: 'id',
  currentAccountId: 'currentAccountId',
  type: 'type',
  amount: 'amount',
  currency: 'currency',
  balanceAfterARS: 'balanceAfterARS',
  balanceAfterUSD: 'balanceAfterUSD',
  description: 'description',
  operationId: 'operationId',
  createdAt: 'createdAt'
};

exports.Prisma.NotebookEntryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  content: 'content',
  isProcessed: 'isProcessed',
  processedAsOpId: 'processedAsOpId',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  severity: 'severity',
  message: 'message',
  metadata: 'metadata',
  status: 'status',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  User: 'User',
  Account: 'Account',
  AccountMovement: 'AccountMovement',
  Operation: 'Operation',
  UsdStockEntry: 'UsdStockEntry',
  CashSession: 'CashSession',
  Recaudadora: 'Recaudadora',
  RecaudadoraMovement: 'RecaudadoraMovement',
  CurrentAccount: 'CurrentAccount',
  CurrentAccountMovement: 'CurrentAccountMovement',
  NotebookEntry: 'NotebookEntry',
  Alert: 'Alert'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
