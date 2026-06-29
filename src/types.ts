export interface User {
  id: string;
  name: string;
  pass: string;
  role: string | null;
  store_id: string;
  is_super: boolean;
}

export interface Store {
  id: string;
  name: string;
  sub_expires: string | null;
  is_vip: boolean;
}

export interface Product {
  id: string;
  name: string;
  cat: string;
  price: number;
  qty: number;
  min: number;
  store_id: string;
}

export interface Debt {
  id: string;
  name: string;
  phone: string | null;
  amount: number;
  note: string | null;
  date: string;
  status: 'active' | 'paid';
  store_id: string;
}

export interface Sale {
  id: string;
  pname: string;
  pcat: string;
  price: number;
  orig_price: number | null;
  qty: number;
  total: number;
  buyer: string | null;
  phone: string | null;
  seller: string;
  date: string;
  sale_type: string; // 'naqt' | 'nasiya'
  store_id: string;
}

export interface AppLog {
  id?: string;
  m: string;
  t: string;
  store_id: string;
}
