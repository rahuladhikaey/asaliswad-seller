export type ProductPackage = {
	id: string;
	name: string;
	price: number;
	mrp?: number;
	isBestSeller?: boolean;
};

export type Product = {
	id: number;
	name: string;
	price: number;
	mrp?: number;
	description: string;
	image_url: string;
	images?: string[];
	category_id: number;
	category_name?: string;
	offers?: string[];
	specifications?: Record<string, string>;
	brand?: string;
	stock?: number;
	sku?: string;
	low_stock_limit?: number;
	status?: string;
	packages?: ProductPackage[];
	seller_id?: string; // added to identify owner seller
};

export type CartItem = Product & {
	quantity: number;
};

export type Order = {
	id: string | number;
	order_number?: string;
	seller_id?: string;
	customer_name: string;
	phone?: string;
	address?: string;
	shipping_address?: any;
	product_details?: string; // JSON string of ordered items
	items?: any[];
	order_status: string;
	payment_status: string;
	payment_method?: string;
	razorpay_order_id?: string;
	razorpay_payment_id?: string;
	shipment_id?: string;
	shiprocket_order_id?: string;
	total_amount: number;
	created_at: string;
};

export type OrderPayload = {
	customer_name: string;
	phone: string;
	address: string;
	items: Array<{ name: string; quantity: number; price: number; subtotal: number }>;
	total: number;
};

export type Category = {
	id: number;
	name: string;
};

export type UserProfile = {
	id: string;
	full_name: string;
	email: string;
	phone_no?: string;
	gender?: string;
	avatar_url?: string;
	status: 'active' | 'suspended';
	role: 'customer' | 'seller' | 'admin';
	created_at: string;
	updated_at: string;
};
