export interface TelegramUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isRegistered: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
  lastActiveAt: Date;
}
