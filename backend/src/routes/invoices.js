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

// Frontend should send 'labour' and 'materials' arrays, not 'lineItems'.
const validateInvoice = [
  body('client').isMongoId().withMessage('Valid client ID is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('labour').isArray().withMessage('Labour must be an array'),
  body('labour.*.type').notEmpty().withMessage('Labour type is required'),
  body('labour.*.hrs').isFloat({ min: 0 }).withMessage('Labour hours must be positive'),
  body('labour.*.rate').isFloat({ min: 0 }).withMessage('Labour rate must be positive'),
  body('labour.*.amount').isFloat({ min: 0 }).withMessage('Labour amount must be positive'),
  body('materials').isArray().withMessage('Materials must be an array'),
  body('materials.*.material').notEmpty().withMessage('Material name is required'),
  body('materials.*.qty').isFloat({ min: 0 }).withMessage('Material quantity must be positive'),
  body('materials.*.amount').isFloat({ min: 0 }).withMessage('Material amount must be positive'),
  body('notes').optional().trim(),
  body('terms').optional().trim()
];

// Generate PDF for invoice
const generatePDF = async (invoice, client) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const settings = await Setting.findOne();

  const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(__dirname, '../uploads', fileName);
  if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
    fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
  }
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // --- HEADER ---
  const logoPath = path.join(__dirname, 'images', 'company-logo.png');
  let topY = 40;
  let leftX = 40;
  let rightX = 300;
  let colWidth = 260;
  // Draw logo
  try {
    doc.image(logoPath, leftX, topY-20, { width: 250 });
  } catch (e) {
    console.error('Error loading logo image:', e);
  }

  // Work Order / Invoice title and number
  doc.font('Helvetica-Bold').fontSize(13).text('Work Order / Invoice', rightX, topY, { width: colWidth, align: 'left' });
  doc.font('Helvetica-Bold').fontSize(13).text(`${invoice.invoiceNumber}`, rightX + colWidth - 80, topY, { width: 80, align: 'right' });

  // --- CLIENT SECTION ---
  let clientY = topY + 90;
  doc.font('Helvetica-Bold').fontSize(10).text('To', leftX, clientY);
  let toY = clientY + 12;
  doc.font('Helvetica').fontSize(11).text(client.name || '', leftX + 20, toY);
  toY += 12;
  if (client.company) { doc.text(client.company, leftX + 20, toY); toY += 12; }
  if (client.address) {
    if (client.address.street) { doc.text(client.address.street, leftX + 20, toY); toY += 12; }
    if (client.address.city || client.address.state || client.address.zipCode) {
      doc.text(`${client.address.city || ''}, ${client.address.state || ''} ${client.address.zipCode || ''}`, leftX + 20, toY); toY += 12;
    }
    if (client.address.country) { doc.text(client.address.country, leftX + 20, toY); toY += 12; }
  }

  // --- DETAILS TABLE ---
  let detailsY = topY;
  const detailLabels = [
    'Invoice Date:',
    'Customer Email:',
    'Customer Number:',
    'Job Location:',
    'Job Date:',
    'Job Start:',
    'Job Finish:'
  ];
  const detailsTable = {
    x: rightX,
    y: detailsY + 25,
    width: colWidth,
    rowHeight: 16,
    rows: detailLabels.length,
    columns: [
      { width: 90 },
      { width: colWidth - 90 }
    ]
  };
  doc.rect(detailsTable.x, detailsTable.y, detailsTable.width, detailsTable.rowHeight * detailsTable.rows).stroke();
  for (let i = 1; i < detailsTable.rows; i++) {
    doc.moveTo(detailsTable.x, detailsTable.y + detailsTable.rowHeight * i)
      .lineTo(detailsTable.x + detailsTable.width, detailsTable.y + detailsTable.rowHeight * i).stroke();
  }
  doc.moveTo(detailsTable.x + detailsTable.columns[0].width, detailsTable.y)
    .lineTo(detailsTable.x + detailsTable.columns[0].width, detailsTable.y + detailsTable.rowHeight * detailsTable.rows).stroke();
  const detailValues = [
    invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '',
    client.email || '',
    client.phone || '',
    invoice.jobLocation || '',
    invoice.jobDate ? new Date(invoice.jobDate).toLocaleDateString() : '',
    invoice.jobStart ? new Date(invoice.jobStart).toLocaleString() : '',
    invoice.jobFinish ? new Date(invoice.jobFinish).toLocaleString() : ''
  ];
  let dy = detailsTable.y;
  for (let i = 0; i < detailLabels.length; i++) {
    doc.font('Helvetica').fontSize(9).text(detailLabels[i], detailsTable.x + 4, dy + 3, { width: detailsTable.columns[0].width - 8, align: 'left' });
    doc.text(detailValues[i], detailsTable.x + detailsTable.columns[0].width + 4, dy + 3, { width: detailsTable.columns[1].width - 8, align: 'left' });
    dy += detailsTable.rowHeight;
  }
  // Adjust detailsTable.rows if needed
  detailsTable.rows = detailLabels.length;

  // --- JOB TYPE CHECKBOXES ---
  let jobTypeY = detailsTable.y + detailsTable.rowHeight * detailsTable.rows + 6;
  const jobTypes = ['Day Work', 'Contract', 'Extra', 'Overtime', 'Other', 'Emergency Call'];
  const cols = 3;
  const rows = 2;
  const gridLeft = rightX + 10;
  const gridWidth = colWidth - 20;
  const colSpacing = Math.floor(gridWidth / cols);
  const rowSpacing = 20;
  const checkboxOffsetY = 7;
  for (let i = 0; i < jobTypes.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const boxX = gridLeft + col * colSpacing;
    const boxY = jobTypeY + checkboxOffsetY + row * rowSpacing;
    doc.rect(boxX, boxY, 8, 8).stroke();
    if (invoice.jobType && invoice.jobType.includes(jobTypes[i])) {
      doc.moveTo(boxX, boxY).lineTo(boxX + 8, boxY + 8).moveTo(boxX + 8, boxY).lineTo(boxX, boxY + 8).stroke();
    }
    doc.font('Helvetica').fontSize(8).text(jobTypes[i], boxX + 12, boxY - 2);
  }

  // --- DESCRIPTION OF WORK ---
  let descY = jobTypeY + 40;
  doc.rect(leftX, descY, 520, 18).fillAndStroke('#000', '#000');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10)
     .text('DESCRIPTION OF WORK', leftX, descY + 3, { width: 520, align: 'center' });
  doc.fillColor('#000');
  descY += 18;
  doc.rect(leftX, descY, 520, 50).stroke();
  doc.font('Helvetica').fontSize(9).text(invoice.descriptionOfWork || '', leftX + 5, descY + 5, { width: 510, height: 40 });

  // --- LABOUR TABLE ---
  let labourY = descY + 50;
  doc.rect(leftX, labourY, 520, 18).fillAndStroke('#000', '#000');
  let lx = leftX;
  const labourHeaders = ['NOTES', 'LABOUR', 'HRS.', 'RATE', 'AMOUNT'];
  const labourColWidths = [125, 90, 70, 70, 165];
  for (let i = 0; i < labourHeaders.length; i++) {
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10)
       .text(labourHeaders[i], lx, labourY + 3, { width: labourColWidths[i], align: 'center' });
    lx += labourColWidths[i];
  }
  doc.fillColor('#000');
  // Table grid
  labourY += 18;
  let labourRows = (invoice.labour || []);
  let labourRowCount = Math.max(labourRows.length + 2, 8); // at least 6 rows
  const labourTable = {
    x: leftX,
    y: labourY,
    width: 520,
    rowHeight: 14,
    rows: labourRowCount,
    columns: [
      { label: 'NOTES', width: 125 },
      { label: 'LABOUR', width: 90 },
      { label: 'HRS.', width: 70 },
      { label: 'RATE', width: 70 },
      { label: 'AMOUNT', width: 165 },
    ]
  };
  doc.rect(labourTable.x, labourTable.y, labourTable.width, labourTable.rowHeight * labourTable.rows).stroke();
  let lx2 = labourTable.x;
  for (let i = 0; i < labourTable.columns.length; i++) {
    lx2 += labourTable.columns[i].width;
    if (i < labourTable.columns.length - 1) doc.moveTo(lx2, labourTable.y).lineTo(lx2, labourTable.y + labourTable.rowHeight * labourTable.rows).stroke();
  }
  for (let i = 1; i <= labourTable.rows; i++) {
    doc.moveTo(labourTable.x, labourTable.y + labourTable.rowHeight * (i - 1)).lineTo(labourTable.x + labourTable.width, labourTable.y + labourTable.rowHeight * (i - 1)).stroke();
  }
  // Fill rows
  let ly = labourTable.y;
  for (let i = 0; i < labourTable.rows; i++) {
    let lx3 = labourTable.x;
    const row = i < labourRows.length ? labourRows[i] : {};
    doc.font('Helvetica').fontSize(9).text(row.notes || '', lx3 + 2, ly + 2, { width: labourTable.columns[0].width - 4 });
    lx3 += labourTable.columns[0].width;
    doc.text(row.type || '', lx3 + 2, ly + 2, { width: labourTable.columns[1].width - 4 });
    lx3 += labourTable.columns[1].width;
    doc.text(row.hrs != null ? row.hrs : '', lx3 + 2, ly + 2, { width: labourTable.columns[2].width - 4 });
    lx3 += labourTable.columns[2].width;
    doc.text(row.rate != null ? `$${row.rate.toFixed(2)}` : '', lx3 + 2, ly + 2, { width: labourTable.columns[3].width - 4 });
    lx3 += labourTable.columns[3].width;
    doc.text(row.amount != null ? `$${row.amount.toFixed(2)}` : '', lx3 + 2, ly + 2, { width: labourTable.columns[4].width - 4 });
    ly += labourTable.rowHeight;
  }
  let afterLabourY = labourTable.y + labourTable.rowHeight * labourTable.rows;

  // --- TOTAL LABOUR HEADER ---
  doc.save();
  doc.rect(leftX, afterLabourY, 520, 18).fill('#fff');
  doc.restore();
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(13)
     .text('TOTAL LABOUR', leftX, afterLabourY + 3, { width: 520, align: 'center' });
  afterLabourY += 18;

  // --- MATERIALS TABLE ---
  let mx = leftX;
  const materialHeaders = ['QTY.', 'MATERIAL', 'AMOUNT'];
  const materialColWidths = [60, 295, 165];
  doc.rect(leftX, afterLabourY, 520, 18).fillAndStroke('#000', '#000');
  for (let i = 0; i < materialHeaders.length; i++) {
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10)
       .text(materialHeaders[i], mx, afterLabourY + 3, { width: materialColWidths[i], align: 'center' });
    mx += materialColWidths[i];
  }
  doc.fillColor('#000');
  afterLabourY += 18;
  let materialRows = (invoice.materials || []);
  let materialRowCount = Math.max(materialRows.length + 2, 15); // at least 10 rows
  const materialsTable = {
    x: leftX,
    y: afterLabourY,
    width: 520,
    rowHeight: 14,
    rows: materialRowCount,
    columns: [
      { label: 'QTY.', width: 60 },
      { label: 'MATERIAL', width: 295 },
      { label: 'AMOUNT', width: 165 },
    ]
  };
  doc.rect(materialsTable.x, materialsTable.y, materialsTable.width, materialsTable.rowHeight * materialsTable.rows).stroke();
  let mx2 = materialsTable.x;
  for (let i = 0; i < materialsTable.columns.length; i++) {
    mx2 += materialsTable.columns[i].width;
    if (i < materialsTable.columns.length - 1) doc.moveTo(mx2, materialsTable.y).lineTo(mx2, materialsTable.y + materialsTable.rowHeight * materialsTable.rows).stroke();
  }
  for (let i = 1; i <= materialsTable.rows; i++) {
    doc.moveTo(materialsTable.x, materialsTable.y + materialsTable.rowHeight * (i - 1)).lineTo(materialsTable.x + materialsTable.width, materialsTable.y + materialsTable.rowHeight * (i - 1)).stroke();
  }
  // Fill rows
  let my = materialsTable.y;
  for (let i = 0; i < materialsTable.rows; i++) {
    let mx3 = materialsTable.x;
    const row = i < materialRows.length ? materialRows[i] : {};
    doc.font('Helvetica').fontSize(9).text(row.qty != null ? row.qty : '', mx3 + 2, my + 2, { width: materialsTable.columns[0].width - 4 });
    mx3 += materialsTable.columns[0].width;
    doc.text(row.material || '', mx3 + 2, my + 2, { width: materialsTable.columns[1].width - 4 });
    mx3 += materialsTable.columns[1].width;
    doc.text(row.amount != null ? `$${row.amount.toFixed(2)}` : '', mx3 + 2, my + 2, { width: materialsTable.columns[2].width - 4 });
    my += materialsTable.rowHeight;
  }
  let afterMaterialsY = materialsTable.y + materialsTable.rowHeight * materialsTable.rows;

  // --- FOOTER SECTION (MATCH SAMPLE) ---
  // Define footer area dimensions
  const footerTop = afterMaterialsY + 2;
  const footerHeight = 100;
  const footerLeftWidth = 360; // slightly wider left section
  const footerRightWidth = 160; // much narrower totals section
  const footerY = footerTop;
  // Draw outer footer rectangle
  doc.rect(leftX, footerY, 520, footerHeight).stroke();

  // --- LEFT SIDE: WORK ORDERED BY, ACKNOWLEDGEMENT, SIGNATURE, THANK YOU ---
  // WORK ORDERED BY label and value
  doc.font('Helvetica-Bold').fontSize(8).text('WORK ORDERED BY', leftX + 5, footerY + 5);
  // Show value if present
  if (invoice.workOrderedBy) {
    doc.font('Helvetica').fontSize(8).text(String(invoice.workOrderedBy), leftX + 120, footerY + 5, { width: footerLeftWidth - 125, align: 'left' });
  }
  // Horizontal line below WORK ORDERED BY row
  doc.moveTo(leftX, footerY + 16).lineTo(leftX + footerLeftWidth, footerY + 16).stroke();
  // Acknowledgement text
  doc.font('Helvetica').fontSize(7).text(
    'I hereby acknowledge the satisfactory completion of the above described work. Payment needs to be made within two weeks from the invoice issue date.',
    leftX + 5, footerY + 18, { width: footerLeftWidth - 10, align: 'justify' }
  );
  // Signature and Date columns: labels on top, value/image below
  const sigColX = leftX + 75;
  const dateColX = leftX + 215;
  const sigLabelY = footerY + 40;
  const sigValueY = sigLabelY + 12;
  // Signature image on top, label below
  let sigImageY = footerY + 40;
  let labelYAligned = footerY + 72; // unified Y for both labels
  if (settings && settings.signature) {
    try {
      const signatureBuffer = Buffer.from(settings.signature.split(',')[1] || settings.signature, 'base64');
      // Center the signature image in its column (column width 90)
      const sigImgWidth = 70;
      const sigImgColWidth = 90;
      const sigImgX = sigColX + (sigImgColWidth - sigImgWidth) / 2;
      doc.image(signatureBuffer, sigImgX, sigImageY, { width: sigImgWidth, height: 25 });
    } catch (e) {
      doc.font('Helvetica').fontSize(9).text('[Invalid Signature Image]', sigColX, sigImageY + 10, { width: 90, align: 'center' });
    }
  }
  doc.font('Helvetica').fontSize(8).text('SIGNATURE', sigColX, labelYAligned, { width: 90, align: 'center' });

  // Date value on top, label below
  let dateValueY = footerY + 50;
  let dateLabelY2 = dateValueY + 16;
  // Center the date value in its column (column width 60)
  doc.font('Helvetica').fontSize(9).text(
    invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '',
    dateColX, dateValueY, { width: 60, align: 'center' }
  );
  doc.font('Helvetica').fontSize(8).text('DATE', dateColX, labelYAligned, { width: 60, align: 'center' });

  // Add extra vertical space above the thank you message
  const thankYouY = footerY + footerHeight - 10;
  // Draw an empty line for spacing
  doc.font('Helvetica').fontSize(11).text(' ', leftX + 5, thankYouY - 18, { width: footerLeftWidth - 10, align: 'center' });
  doc.font('Helvetica-BoldOblique').fontSize(11).text(
    'THANK YOU FOR THE BUSINESS',
    leftX + 5,
    thankYouY,
    { width: footerLeftWidth - 10, align: 'center' }
  );

  // --- RIGHT SIDE: TOTALS TABLE ---
  const totalsTableX = leftX + footerLeftWidth;
  const totalsTableY = footerY;
  const totalsTableWidth = footerRightWidth;
  const totalsTableRowHeight = 14.3;
  const totalsLabelColWidth = 100;
  const totalsValueColWidth = totalsTableWidth - totalsLabelColWidth;
  const totalsTableRows = [
    'TOTAL MATERIALS',
    'TOTAL LABOUR',
    'SUBTOTAL',
    'PST',
    'GST',
    'OTHER CHARGES',
    'TOTAL'
  ];
  // Draw table grid
  doc.rect(totalsTableX, totalsTableY, totalsTableWidth, totalsTableRowHeight * totalsTableRows.length).stroke();
  // Horizontal lines
  for (let i = 1; i < totalsTableRows.length; i++) {
    doc.moveTo(totalsTableX, totalsTableY + i * totalsTableRowHeight)
      .lineTo(totalsTableX + totalsTableWidth, totalsTableY + i * totalsTableRowHeight).stroke();
  }
  // Vertical line between label and value columns
  doc.moveTo(totalsTableX + totalsLabelColWidth, totalsTableY)
    .lineTo(totalsTableX + totalsLabelColWidth, totalsTableY + totalsTableRowHeight * totalsTableRows.length).stroke();
  // Thicker border for TOTAL row
  doc.save();
  doc.lineWidth(2);
  doc.moveTo(totalsTableX, totalsTableY + totalsTableRowHeight * (totalsTableRows.length - 1))
    .lineTo(totalsTableX + totalsTableWidth, totalsTableY + totalsTableRowHeight * (totalsTableRows.length - 1)).stroke();
  doc.restore();
  // Fill table
  const totalMaterials = (invoice.materials || []).reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalLabour = (invoice.labour || []).reduce((sum, l) => sum + (l.amount || 0), 0);
  const subtotal = totalMaterials + totalLabour;
  // PST and GST as percentages
  const pstRate = invoice.pst || 0;
  const gstRate = invoice.gst || 0;
  const pstAmount = (pstRate / 100) * subtotal;
  const gstAmount = (gstRate / 100) * subtotal;
  const otherCharges = invoice.otherCharges || 0;
  const total = subtotal + pstAmount + gstAmount + otherCharges;
  // Update labels for PST and GST to include percentage
  const totalsTableLabels = [
    'TOTAL MATERIALS',
    'TOTAL LABOUR',
    'SUBTOTAL',
    `PST (${pstRate}%)`,
    `GST (${gstRate}%)`,
    'OTHER CHARGES',
    'TOTAL'
  ];
  const totalsValues = [
    `$${totalMaterials.toFixed(2)}`,
    `$${totalLabour.toFixed(2)}`,
    `$${subtotal.toFixed(2)}`,
    `$${pstAmount.toFixed(2)}`,
    `$${gstAmount.toFixed(2)}`,
    `$${otherCharges.toFixed(2)}`,
    `$${total.toFixed(2)}`
  ];
  for (let i = 0; i < totalsTableLabels.length; i++) {
    const isTotal = i === totalsTableLabels.length - 1;
    const font = isTotal ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(font).fontSize(9).text(totalsTableLabels[i], totalsTableX + 5, totalsTableY + i * totalsTableRowHeight + 3, { width: totalsLabelColWidth - 10 });
    doc.text(totalsValues[i], totalsTableX + totalsLabelColWidth + 5, totalsTableY + i * totalsTableRowHeight + 3, { width: totalsValueColWidth - 10, align: 'right' });
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

    // Always generate/update PDF
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

    // Always generate/update PDF
    const pdfPath = await generatePDF(invoice, invoice.client);
    
    // Update invoice with PDF URL if not already set
    if (!invoice.pdfUrl) {
      invoice.pdfUrl = `/uploads/invoice-${invoice.invoiceNumber}.pdf`;
      await invoice.save();
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
  const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancel'];
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