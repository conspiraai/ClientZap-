# Overview

ClientZap is a SaaS MVP designed for freelancers to automate client onboarding processes. The platform provides tools for creating custom intake forms, generating contracts with e-signature capabilities, scheduling client calls, and managing the entire onboarding workflow through a comprehensive dashboard. Built as a full-stack web application, ClientZap aims to save freelancers 5+ hours per week on administrative tasks while providing a professional client experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (January 2025)

## Homepage Refinement and Authentication Flow
- **Replaced "Join Waitlist" with "Create Your Free Account"**: Updated landing page to remove waitlist functionality and replace with direct account creation CTA
- **Smart Authentication Redirects**: Logged-in users are automatically redirected to dashboard when visiting homepage or auth pages
- **Removed Waitlist Logic**: Completely removed waitlist routes, storage methods, and UI components throughout the codebase
- **Professional Landing Page**: Cleaned up demo placeholders and ensured all CTAs link to proper registration flow
- **Consistent CTA Design**: Multiple "Create Your Free Account" buttons throughout landing page for better conversion

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Radix UI components with shadcn/ui for consistent, accessible design
- **Styling**: Tailwind CSS with custom design system using CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Authentication**: Passport.js with local strategy using session-based authentication
- **Password Security**: Native Node.js crypto module with scrypt for password hashing
- **Session Management**: Express sessions with configurable storage (memory store for development)
- **API Design**: RESTful endpoints with protected routes requiring authentication

## Database Layer
- **ORM**: Drizzle ORM for type-safe database interactions
- **Database**: PostgreSQL as primary database (configured via Drizzle config)
- **Schema Management**: Centralized schema definitions in shared directory
- **Migration**: Drizzle Kit for database migrations and schema changes

## Development Setup
- **Monorepo Structure**: Client and server code in separate directories with shared schema
- **Build System**: ESBuild for server bundling, Vite for client bundling
- **Development**: Hot module replacement and development server integration
- **TypeScript**: Full TypeScript support across frontend, backend, and shared code
- **Path Aliases**: Configured path mapping for clean imports (@/, @shared/, etc.)

## Security & Authentication
- **Session-based Authentication**: Secure session management with configurable secrets
- **Password Hashing**: Cryptographically secure password storage using scrypt
- **Protected Routes**: Route-level authentication guards on both client and server
- **CSRF Protection**: Built into session configuration
- **Environment Configuration**: Secure handling of database URLs and session secrets

## External Integrations (Planned)
- **DocuSign API**: Contract generation and e-signature functionality
- **Calendly API**: Scheduling integration for client calls
- **Email Services**: Waitlist management and client communications

## Data Models
- **Users**: Authentication and profile management
- **Clients**: Customer information and onboarding status tracking
- **Forms**: Dynamic form builder with customizable fields
- **Contracts**: Document management with signing status
- **Waitlist**: Pre-launch signup collection

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe ORM for database operations
- **express**: Web application framework for Node.js
- **passport**: Authentication middleware
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing for React

## UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant styling
- **lucide-react**: Icon library

## Development Tools
- **vite**: Build tool and development server
- **typescript**: Type system for JavaScript
- **drizzle-kit**: Database migration and introspection tools
- **esbuild**: Fast JavaScript bundler for server code

## Planned External Services
- **DocuSign API**: Contract e-signature service (free tier)
- **Calendly API**: Appointment scheduling service (free tier)
- **Mailchimp**: Email marketing and waitlist management (free tier)