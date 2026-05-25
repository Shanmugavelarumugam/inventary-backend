export enum BranchType {
  STORE = 'STORE',
  WAREHOUSE = 'WAREHOUSE',
  OUTLET = 'OUTLET',
  KITCHEN = 'KITCHEN',
  COUNTER = 'COUNTER',
}

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum StockTransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}
