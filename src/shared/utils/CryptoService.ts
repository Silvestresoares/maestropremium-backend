import crypto from 'crypto';

// A chave de encriptação deve ter 32 bytes (256 bits). Em produção, isto DEVE vir de variável de ambiente.
// O salt do blind index é usado para garantir que o hash não seja o mesmo de outros sistemas.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-super-secret-key-32-byte'; 
const BLIND_INDEX_SALT = process.env.BLIND_INDEX_SALT || 'default-blind-index-salt';

// Garante 32 bytes exatos caso a chave padrão ou a da variável não tenha exatamente esse tamanho
const validKey = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

export class CryptoService {
  /**
   * Criptografa uma string usando AES-256-GCM.
   * Retorna um formato: iv:authTag:encryptedData (base64)
   */
  static encrypt(text: string): string {
    if (!text) return text;
    // Se o texto já estiver no formato de criptografia (contendo 2 dois pontos), ignorar a re-criptografia
    if (text.split(':').length === 3) return text;

    const iv = crypto.randomBytes(12); // GCM recomenda 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', validKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  /**
   * Descriptografa uma string previamente criptografada por esta classe.
   */
  static decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Se não estiver no formato esperado (ex: dados antigos em texto plano), retornar original
      return encryptedText;
    }

    try {
      const [ivBase64, authTagBase64, encryptedBase64] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', validKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar dado:', error);
      return encryptedText; // Em caso de falha severa, tenta retornar o texto para não quebrar a tela inteira
    }
  }

  /**
   * Gera um hash determinístico forte para busca de índices no banco (Blind Index).
   */
  static generateBlindIndex(text: string): string {
    if (!text) return text;
    // Usamos HMAC SHA-256 com um Salt de sistema para evitar Rainbow Tables
    return crypto.createHmac('sha256', BLIND_INDEX_SALT)
                 .update(text.toLowerCase().trim())
                 .digest('hex');
  }
}
