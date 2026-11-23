export interface SendMessageOptions {
  to: string;
  body: string;
  subject?: string;
  template?: string;
  token?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessagingProvider {
  send(options: SendMessageOptions): Promise<SendResult>;
}
