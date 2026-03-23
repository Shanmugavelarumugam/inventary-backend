import * as bcrypt from 'bcrypt';

export class HashUtil {
  static async hash(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  static async compare(data: string, encrypted: string): Promise<boolean> {
    return bcrypt.compare(data, encrypted);
  }
}
