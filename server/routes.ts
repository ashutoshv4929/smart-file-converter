import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversionSchema } from '@shared/schema';
import { z } from "zod";
import convertRouter from "./convert";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register file conversion router
  app.use(convertRouter);
  // Get all conversions
  app.get("/api/conversions", async (req, res) => {
    try {
      const conversions = await storage.getConversions();
      res.json(conversions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversions" });
    }
  });

  // Get conversions by date range
  app.get("/api/conversions/recent/:days", async (req, res) => {
    try {
      const days = parseInt(req.params.days);
      if (isNaN(days) || days < 0) {
        return res.status(400).json({ message: "Invalid days parameter" });
      }
      
      const conversions = await storage.getConversionsByDate(days);
      res.json(conversions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent conversions" });
    }
  });

  // Create a new conversion record
  app.post("/api/conversions", async (req, res) => {
    try {
      const validatedData = insertConversionSchema.parse(req.body);
      const conversion = await storage.createConversion(validatedData);
      res.status(201).json(conversion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversion data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create conversion record" });
    }
  });

  // Delete a conversion
  app.delete("/api/conversions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversion ID" });
      }
      
      await storage.deleteConversion(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversion" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
