export interface SellerSettlement {
  id: string;
  seller_id: string;
  seller_name?: string;
  seller_email?: string;
  amount: number;
  upi_id: string;
  payment_method: 'PhonePe' | 'UPI' | 'GPay' | 'Bank Transfer';
  utr_number?: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  paid_at?: string;
  created_at: string;
  notes?: string;
}

export interface SellerPaymentDetails {
  upi_id: string;
  payment_method: 'PhonePe' | 'UPI' | 'GPay' | 'Bank Transfer';
  account_name?: string;
  phone_number?: string;
  updated_at?: string;
}
