# Invoice Builder Application

A full-stack invoice builder application built with Node.js, Express.js, MongoDB, and React.js. This application allows users to create, manage, and send professional invoices to clients.

## Features

- Create and manage client information
- Generate professional invoices with line items and tax calculations
- Send invoices via email with PDF attachments
- Download invoices as PDF files
- Responsive design for all devices
- Real-time invoice preview
- Dashboard with key metrics
- Client management system

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB (with Mongoose)
- PDFKit for PDF generation
- Nodemailer for email functionality
- Winston for logging

### Frontend
- React.js
- Material-UI for components
- Formik & Yup for form handling and validation
- React Router for navigation
- Axios for API requests
- React Toastify for notifications

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- SMTP server for email functionality (e.g., Gmail)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd invoice-builder
   ```

2. Install dependencies for both backend and frontend:
   ```bash
   npm run install:all
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/invoice-builder
   NODE_ENV=development
   
   # SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password
   SMTP_FROM=your-email@gmail.com
   ```

4. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

## Running the Application

1. Start both backend and frontend concurrently:
   ```bash
   npm start
   ```

   Or start them separately:
   ```bash
   # Terminal 1 - Backend
   npm run start:backend

   # Terminal 2 - Frontend
   npm run start:frontend
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Usage

1. **Dashboard**
   - View key metrics and recent invoices
   - Quick access to create new invoices

2. **Clients**
   - Add new clients with detailed information
   - Manage existing client records
   - View client history

3. **Invoices**
   - Create new invoices with line items
   - Add tax rates and calculate totals
   - Preview invoices before sending
   - Send invoices via email
   - Download invoices as PDF
   - Track invoice status

## Development

### Project Structure

```
invoice-builder/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│   ├── .env
│   └── package.json
└── package.json
```

### Available Scripts

- `npm start`: Start both backend and frontend
- `npm run start:backend`: Start backend server
- `npm run start:frontend`: Start frontend development server
- `npm run install:all`: Install dependencies for both backend and frontend
- `npm run test`: Run tests (backend)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 