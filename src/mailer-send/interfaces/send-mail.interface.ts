export interface SendMail {
  to: string;
  recipientName?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  path: string;
  filename: string;
}
