export enum SalesSource {
  POS = 'POS',
  ONLINE = 'ONLINE',
  MANUAL = 'MANUAL',
}

export enum SalesOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum SalesOrderType {
  TABLE = 'TABLE',
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  WALKIN = 'WALKIN',
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
}
