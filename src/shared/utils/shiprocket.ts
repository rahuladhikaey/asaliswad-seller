/**
 * Shiprocket Utility for Admin & Seller Panels
 */

const SHIPROCKET_API = "https://apiv2.shiprocket.in/v1/external";

export async function getShiprocketToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Shiprocket credentials missing in environment variables.");
  }

  const response = await fetch(`${SHIPROCKET_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to authenticate with Shiprocket");
  }

  return data.token;
}

export async function createShiprocketOrder(token: string, orderData: any) {
  const response = await fetch(`${SHIPROCKET_API}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to create Shiprocket order");
  }

  return data;
}

export async function trackShipment(token: string, shipmentId: string) {
  const response = await fetch(`${SHIPROCKET_API}/courier/track/shipment/${shipmentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}
