export enum OrderStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Cancelled = 'Cancelled',
}

export enum Courier {
  Steadfast = 'Steadfast',
  Pathao = 'Pathao',
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  shippingAddress: string;
  courier?: Courier;
  trackingId?: string;
}

export interface CustomerHistory {
  totalParcels: number;
  delivered: number;
  returned: number;
  pending: number;
}