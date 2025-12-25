# Secure File Attachment System

A full-stack application for securely uploading, storing, and managing files. Built with React (Vite), Express, and Supabase.

## Features

- **User Authentication**: Secure Sign Up and Sign In powered by Supabase Auth.
- **Secure File Upload**: Drag and drop interface for uploading multiple files.
- **Private Storage**: Files are stored in Supabase Storage with Row Level Security (RLS) - users can only access their own files.
- **File Management**: View a list of your uploaded files and download them securely via signed URLs.
- **Backend Validation**: An Express.js middleware server handles file processing and metadata storage.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Supabase Client
- **Backend**: Node.js, Express, TypeScript, Multer
- **Database & Auth**: Supabase (PostgreSQL, GoTrue, Storage)

## Prerequisites

- Node.js (v18+ recommended)
- A [Supabase](https://supabase.com/) account and project

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project.
2. Run the SQL script located in `server/schema.sql` in your Supabase project's SQL Editor. This will:
   - Create the `files` table.
   - Enable Row Level Security (RLS).
   - Set up access policies.
3. Create a Storage Bucket named `user-uploads` in the Supabase Dashboard.
   - Ensure the bucket is private (default).
   - You may need to add storage policies to allow authenticated users to upload and read their own files.

### 2. Backend Setup (`server/`)

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your Supabase credentials in `.env`:
   - `SUPABASE_URL`: Your Project URL
   - `SUPABASE_SERVICE_KEY`: Your Service Role Key (needed for admin operations)
   - `SUPABASE_ANON_KEY`: Your Anon/Public Key
5. Start the server:
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:3000`.

### 3. Frontend Setup (`/`)

1. Return to the root directory:
   ```bash
   cd ..
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file (or rename a template if one exists) and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
   The application will run on `http://localhost:5173`.

## Usage

1. Open `http://localhost:5173`.
2. Sign up for a new account (or sign in).
3. Drag and drop files or use the "Browse files" button.
4. Click "Upload Files" to securely store them.
5. View your uploaded files in the "My Files" section and download them anytime.

## API Endpoints

- `POST /api/files/upload`: Upload a file (Multipart form-data).
- `GET /api/files`: List all files for the authenticated user.
- `GET /api/files/:id/download`: Get a signed URL to download a specific file.
- `DELETE /api/files/:id`: Delete a file.
