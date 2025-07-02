const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Setting = require('../models/Setting');

// Validation middleware
const validateInvoice = [
  body('client').isMongoId().withMessage('Valid client ID is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('lineItems').isArray().withMessage('Line items must be an array'),
  body('lineItems.*.description').trim().notEmpty().withMessage('Description is required'),
  body('lineItems.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('lineItems.*.taxRate').isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('notes').optional().trim(),
  body('terms').optional().trim()
];

// Generate PDF for invoice
const generatePDF = async (invoice, client) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const settings = await Setting.findOne();

  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(__dirname, '../uploads', fileName);
  
  // Ensure uploads directory exists
  if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
    fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
  }

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.font('Helvetica-Bold').fontSize(20).text('INVOICE', { align: 'center' });
  doc.moveDown();

  
  const companyAddressStartY = doc.y;
  // Company Address from settings
  if (settings && settings.companyName) {
    doc.font('Helvetica').fontSize(10).text(settings.companyName);
  }
  if (settings && settings.address) {
    const companyAddress = settings.address.split(',').map(line => line.trim());
    let companyAddressY = companyAddressStartY;
    companyAddress.forEach(line => {
      doc.font('Helvetica').fontSize(10).text(line);
    });
  }
  const companyAddressEndY = doc.y;
  doc.y = companyAddressStartY;

  // Invoice Details and Client Info
  const topY = doc.y;
  doc.fontSize(10);
  doc.font('Helvetica-Bold').text('Bill To:', 350, topY);
  doc.font('Helvetica').text(client.name, 400, topY);

  let clientAddressY = topY + 15;
  if(client.company) {
    doc.text(client.company, 400, clientAddressY);
    clientAddressY += 15;
  }
  doc.text(client.address.street, 400, clientAddressY);
  clientAddressY += 15;
  doc.text(`${client.address.city}, ${client.address.state} ${client.address.zipCode}`, 400, clientAddressY);
  clientAddressY += 15;
  doc.text(client.address.country, 400, clientAddressY);
  
  doc.font('Helvetica-Bold').text('Invoice Number:', 200, topY);
  doc.font('Helvetica').text(invoice.invoiceNumber, 280, topY);

  doc.font('Helvetica-Bold').text('Issue Date:', 200, topY + 15);
  doc.font('Helvetica').text(new Date(invoice.issueDate).toLocaleDateString(), 280, topY + 15);

  doc.font('Helvetica-Bold').text('Due Date:', 200, topY + 30);
  doc.font('Helvetica').text(new Date(invoice.dueDate).toLocaleDateString(), 280, topY + 30);
  
  doc.y = Math.max(companyAddressEndY, clientAddressY, topY + 45);
  doc.moveDown(3);

  // Table
  const tableTop = doc.y;
  
  const drawTableRow = (row, y, isHeader = false) => {
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 11 : 10);
    doc.text(row.description, 50, y, { width: 260 });
    doc.text(row.quantity, 310, y, { width: 50, align: 'right' });
    doc.text(row.unitPrice, 370, y, { width: 70, align: 'right' });
    doc.text(row.tax, 440, y, { width: 50, align: 'right' });
    doc.text(row.total, 500, y, { width: 70, align: 'right' });
  };

  // Table Header
  const header = { description: 'Description', quantity: 'Qty', unitPrice: 'Price', tax: 'Tax', total: 'Total' };
  drawTableRow(header, tableTop, true);
  doc.lineCap('butt').moveTo(50, tableTop + 15).lineTo(570, tableTop + 15).stroke();
  
  let y = tableTop + 25;

  // Table Rows
  invoice.lineItems.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const itemTax = itemTotal * (item.taxRate / 100);
    const row = {
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: `$${item.unitPrice.toFixed(2)}`,
      tax: `$${itemTax.toFixed(2)}`,
      total: `$${(itemTotal + itemTax).toFixed(2)}`
    };

    if (y > 700) { // page break
        doc.addPage();
        y = 50;
    }
    drawTableRow(row, y);
    y += 20;
  });

  doc.y = y; // Move y position below table
  doc.moveDown(2);

  // Totals
  if (doc.y > 650) {
    doc.addPage();
    doc.y = 50;
  }
  const totalsY = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Subtotal:', 400, totalsY, { align: 'left' });
  doc.font('Helvetica').text(`$${invoice.subtotal.toFixed(2)}`, 0, totalsY, { align: 'right' });

  doc.font('Helvetica-Bold').text('Tax Total:', 400, totalsY + 20, { align: 'left' });
  doc.font('Helvetica').text(`$${invoice.taxTotal.toFixed(2)}`, 0, totalsY + 20, { align: 'right' });

  doc.font('Helvetica-Bold').text('Total:', 400, totalsY + 40, { align: 'left' });
  doc.font('Helvetica-Bold').text(`$${invoice.total.toFixed(2)}`, 0, totalsY + 40, { align: 'right' });

  doc.y = totalsY + 65;

  const effectiveTerms = (invoice.terms && invoice.terms.trim() !== "") ? invoice.terms : (settings ? settings.termsAndConditions : "");

  // Terms and Conditions on a new page
  if (effectiveTerms && effectiveTerms.trim() !== "") {
    doc.addPage();
    doc.y = 50;
    doc.font('Helvetica-Bold').fontSize(12).text('Terms and Conditions', { align: 'center' });
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10).text(effectiveTerms, {
        width: doc.page.width - 100,
        align: 'justify'
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

// Send email with PDF attachment
const sendInvoiceEmail = async (client, invoice, pdfPath) => {
  const transporter = nodemailer.createTransport({
    // host: process.env.SMTP_HOST,
    // port: process.env.SMTP_PORT,
    // secure: process.env.SMTP_SECURE === 'true',
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: client.email,
    subject: `Invoice ${invoice.invoiceNumber} from Your Company`,
    text: `Dear ${client.name},\n\nPlease find attached invoice ${invoice.invoiceNumber}.\n\nBest regards,\nYour Company`,
    attachments: [{
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      path: pdfPath
    }]
  };

  return transporter.sendMail(mailOptions);
};

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('client', 'name email company')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new invoice
router.post('/', validateInvoice, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // console.log('Creating invoice with data:', req.body);
    
    // Generate invoice number (you might want to implement a more sophisticated system)
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${(count + 1).toString().padStart(6, '0')}`;
    
    const invoice = new Invoice({
      ...req.body,
      invoiceNumber
    });
    
    // console.log('Invoice object before save:', invoice);
    
    const newInvoice = await invoice.save();
    // console.log('Invoice saved successfully:', newInvoice);
    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update invoice
router.put('/:id', validateInvoice, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Update the invoice fields
    Object.assign(invoice, req.body);
    
    // Save the invoice to trigger pre-save hooks for total calculations
    const updatedInvoice = await invoice.save();
    
    // Populate client data before sending response
    await updatedInvoice.populate('client');
    
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Delete associated PDF if it exists
    if (invoice.pdfUrl) {
      const pdfPath = path.join(__dirname, '../uploads', `invoice-${invoice.invoiceNumber}.pdf`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate and send invoice
router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Generate PDF
    const pdfPath = await generatePDF(invoice, invoice.client);
    
    // Update invoice with PDF URL
    invoice.pdfUrl = `/uploads/invoice-${invoice.invoiceNumber}.pdf`;
    invoice.status = 'sent';
    await invoice.save();

    // Send email
    await sendInvoiceEmail(invoice.client, invoice, pdfPath);

    res.json({ message: 'Invoice sent successfully', pdfUrl: invoice.pdfUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download invoice PDF
router.get('/:id/download', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    let pdfPath;
    
    // Check if PDF already exists
    if (invoice.pdfUrl) {
      pdfPath = path.join(__dirname, '..', invoice.pdfUrl);
    }
    
    // If PDF doesn't exist, generate it
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      pdfPath = await generatePDF(invoice, invoice.client);
      
      // Update invoice with PDF URL if not already set
      if (!invoice.pdfUrl) {
        invoice.pdfUrl = `/uploads/invoice-${invoice.invoiceNumber}.pdf`;
        await invoice.save();
      }
    }

    res.download(pdfPath, `invoice-${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.status = status;
    await invoice.save();
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 