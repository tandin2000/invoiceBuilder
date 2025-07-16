const mongoose = require('mongoose');

// New Labour Schema
const labourSchema = new mongoose.Schema({
  notes: { type: String, trim: true },
  type: { type: String, enum: ['FIRST HOUR', 'ADDITIONAL HOUR', 'SECOND LABOUR'], required: true },
  hrs: { type: Number, min: 0, required: true },
  rate: { type: Number, min: 0, required: true },
  amount: { type: Number, min: 0, required: true }
});

// New Material Schema
const materialSchema = new mongoose.Schema({
  qty: { type: Number, min: 0, required: true },
  material: { type: String, required: true, trim: true },
  amount: { type: Number, min: 0, required: true }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancel'],
    default: 'draft'
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxTotal: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true
  },
  pdfUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  jobLocation: { type: String, trim: true },
  jobDate: { type: Date },
  jobStart: { type: Date },
  jobFinish: { type: Date },
  customerEmail: { type: String, trim: true },
  customerNumber: { type: String, trim: true },
  jobType: [{ type: String, enum: ['Day Work', 'Contract', 'Extra', 'Overtime', 'Other', 'Emergency Call'] }],
  descriptionOfWork: { type: String, trim: true },
  labour: [labourSchema],
  materials: [materialSchema],
  pst: { type: Number, min: 0, default: 0 },
  gst: { type: Number, min: 0, default: 0 },
  otherCharges: { type: Number, min: 0, default: 0 },
  workOrderedBy: { type: String, trim: true },
  footerNote: { type: String, trim: true, default: 'THANK YOU FOR THE BUSINESS' },
});

// Calculate totals before validation using labour and materials
invoiceSchema.pre('validate', function(next) {
  // Calculate subtotal as sum of all labour.amount and materials.amount
  const labourSubtotal = (this.labour || []).reduce((sum, l) => sum + (l.amount || 0), 0);
  const materialsSubtotal = (this.materials || []).reduce((sum, m) => sum + (m.amount || 0), 0);
  this.subtotal = labourSubtotal + materialsSubtotal;

  // Calculate taxTotal using pst and gst as percentages of labourSubtotal only
  const pstValue = this.pst ? (labourSubtotal * this.pst / 100) : 0;
  const gstValue = this.gst ? (labourSubtotal * this.gst / 100) : 0;
  this.taxTotal = pstValue + gstValue;

  // Total = subtotal + taxTotal + otherCharges
  this.total = this.subtotal + this.taxTotal + (this.otherCharges || 0);
  next();
});

// Update the updatedAt timestamp before saving
invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema); 