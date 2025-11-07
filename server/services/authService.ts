// @ts-nocheck
import { storage } from "../storage";
import { InsertUser } from "@shared/schema";
import bcrypt from "bcrypt";

export class AuthService {
  async login(username: string, password: string): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid credentials' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Account is deactivated' };
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  async register(userData: InsertUser): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return { success: false, message: 'Username already exists' };
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return { success: false, message: 'Email already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }
}

export const authService = new AuthService();
