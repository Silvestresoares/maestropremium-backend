import axios from 'axios';
import { AppError } from '../../../shared/errors/AppError';

interface AsaasCustomerData {
  name: string;
  email: string;
  cpfCnpj?: string;
}

interface AsaasSubscriptionData {
  customer: string; // Asaas customer ID
  billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description: string;
}

interface AsaasPaymentData {
  customer: string;
  billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
}

export class AsaasService {
  private api;

  constructor() {
    const apiKey = process.env.ASAAS_API_KEY;
    const baseURL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

    this.api = axios.create({
      baseURL,
      headers: {
        access_token: apiKey || '',
        'Content-Type': 'application/json',
      },
    });
  }

  async createCustomer(data: AsaasCustomerData) {
    try {
      const response = await this.api.post('/customers', data);
      return response.data; // { id, name, ... }
    } catch (error: any) {
      console.error('Erro ao criar cliente Asaas:', error.response?.data || error.message);
      throw new AppError('Erro ao criar cliente no gateway de pagamento', 500);
    }
  }

  async createSubscription(data: AsaasSubscriptionData) {
    try {
      const response = await this.api.post('/subscriptions', data);
      return response.data; // { id, ... }
    } catch (error: any) {
      console.error('Erro ao criar assinatura Asaas:', error.response?.data || error.message);
      throw new AppError('Erro ao criar assinatura', 500);
    }
  }

  async createPayment(data: AsaasPaymentData) {
    try {
      const response = await this.api.post('/payments', data);
      return response.data; // { id, invoiceUrl, pixQrCode, ... }
    } catch (error: any) {
      console.error('Erro ao criar cobrança avulsa Asaas:', error.response?.data || error.message);
      throw new AppError('Erro ao criar cobrança', 500);
    }
  }

  async getPaymentPixQrCode(paymentId: string) {
    try {
      const response = await this.api.get(`/payments/${paymentId}/pixQrCode`);
      return response.data; // { encodedImage, payload, expirationDate }
    } catch (error: any) {
      console.error('Erro ao buscar QR Code PIX:', error.response?.data || error.message);
      throw new AppError('Erro ao buscar código PIX', 500);
    }
  }
}
