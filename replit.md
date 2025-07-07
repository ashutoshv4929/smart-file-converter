# replit.md

## Overview

This is a Smart File Converter PWA (Progressive Web App) built as a full-stack application using React frontend with TypeScript, Express.js backend, and PostgreSQL database. The application allows users to convert files between different formats (PDF to Word, Word to PDF, text extraction with OCR, etc.) with both online and offline capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state
- **PWA Features**: Service Worker for offline functionality, Web App Manifest

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful API with JSON responses
- **File Processing**: Client-side file conversion using libraries like pdf-lib, docx, and Tesseract.js for OCR

### Mobile-First Design
- Responsive design optimized for mobile devices
- Bottom navigation pattern for mobile UX
- Touch-friendly interface elements
- PWA capabilities for app-like experience on mobile

## Key Components

### Database Schema (Drizzle ORM)
- **conversions table**: Tracks file conversion history with fields for filename, formats, file size, status, and timestamps
- Uses PostgreSQL with Neon serverless database connectivity

### API Endpoints
- `GET /api/conversions` - Retrieve all conversion records
- `GET /api/conversions/recent/:days` - Get conversions within specified days
- `POST /api/conversions` - Create new conversion record
- `DELETE /api/conversions/:id` - Delete conversion record

### Frontend Pages
- **Home**: Main converter interface with format selection
- **Files**: File management and recent files
- **History**: Conversion history and statistics
- **Settings**: Theme toggle, data management, PWA installation

### File Conversion Engine
- **Client-side processing**: All file conversions happen in the browser
- **Supported formats**: PDF, Word (DOCX), Text, Images
- **OCR capabilities**: Text extraction from images using Tesseract.js
- **Progress tracking**: Real-time conversion progress feedback

## Data Flow

1. **File Upload**: User selects file and target format through the UI
2. **Client Processing**: File conversion happens entirely in the browser using specialized libraries
3. **Progress Updates**: Real-time progress feedback during conversion
4. **Result Download**: Converted file is downloaded to user's device
5. **History Tracking**: Conversion metadata is stored locally and optionally synced to server
6. **Offline Support**: Core conversion features work without internet connection

## External Dependencies

### Core Libraries
- **pdf-lib**: PDF manipulation and generation
- **docx**: Word document processing
- **Tesseract.js**: OCR text extraction
- **file-saver**: File download functionality

### Database & Infrastructure
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **Drizzle ORM**: Type-safe database operations
- **connect-pg-simple**: PostgreSQL session store

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library

## Deployment Strategy

### Development
- **Hot Reload**: Vite dev server with HMR
- **Type Checking**: TypeScript compilation in real-time
- **Database**: Local PostgreSQL or Neon serverless database

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: ESBuild bundles Node.js server code
- **Database**: PostgreSQL with Drizzle migrations
- **PWA**: Service worker caching for offline functionality

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment specification (development/production)

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 07, 2025. Initial setup