import { conversions, type Conversion, type InsertConversion } from '../../shared/schema';

export interface IStorage {
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversions(): Promise<Conversion[]>;
  getConversionsByDate(days: number): Promise<Conversion[]>;
  deleteConversion(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private conversions: Map<number, Conversion>;
  private currentId: number;

  constructor() {
    this.conversions = new Map();
    this.currentId = 1;
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const id = this.currentId++;
    const conversion: Conversion = {
      ...insertConversion,
      id,
      createdAt: new Date(),
    };
    this.conversions.set(id, conversion);
    return conversion;
  }

  async getConversions(): Promise<Conversion[]> {
    return Array.from(this.conversions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getConversionsByDate(days: number): Promise<Conversion[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.conversions.values())
      .filter(conversion => conversion.createdAt >= cutoffDate)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteConversion(id: number): Promise<void> {
    this.conversions.delete(id);
  }
}

export const storage = new MemStorage();
