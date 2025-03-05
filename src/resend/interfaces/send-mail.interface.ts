export interface SendMail {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  content?: string;
  filename: string;
  type?: string;
  path?: string;
}
